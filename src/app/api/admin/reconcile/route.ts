import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { requireAdmin } from '@/lib/auth/guards';
import { signTicket } from '@/lib/qr/hmac';
import { FieldValue } from 'firebase-admin/firestore';
import { generateQrCodeDataUrl } from '@/lib/qr/generator';

const AMOUNT_TOLERANCE = 5; // EGP

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.authorized) {
    return authResult.response;
  }

  try {
    const db = getAdminDb();
    // Query registrants awaiting match against the bank statement
    const snapshot = await db
      .collection('registrants')
      .where('status', 'in', ['pending_verification', 'manual_review'])
      .get();

    let matched = 0;
    let reviewed = 0;
    let duplicates = 0;

    for (const regDoc of snapshot.docs) {
      reviewed++;
      const regData = regDoc.data();
      const extractedRef = regData.selfReportedReference;

      if (!extractedRef) continue;

      // Lookup bank transaction by reference number (document ID)
      const txRef = db.collection('bankTransactions').doc(extractedRef);
      const txSnap = await txRef.get();

      if (!txSnap.exists) continue;

      const txData = txSnap.data()!;

      // Check for duplicate reference (already matched to someone else)
      if (txData.matchedRegistrantId && txData.matchedRegistrantId !== regDoc.id) {
        // Flag both registrants for manual review with duplicate warning
        await regDoc.ref.update({
          status: 'manual_review',
          adminNotes: `⚠️ Duplicate reference detected — also matched to ${txData.matchedRegistrantId}`,
        });
        duplicates++;
        continue;
      }

      // Amount tolerance check
      if (
        regData.selfReportedAmount != null &&
        Math.abs(regData.selfReportedAmount - txData.amount) > AMOUNT_TOLERANCE
      ) {
        await regDoc.ref.update({
          status: 'manual_review',
          adminNotes: `Amount mismatch: reported=${regData.selfReportedAmount}, Bank=${txData.amount}`,
        });
        continue;
      }

      // Match! Auto-approve
      const batch = db.batch();

      // Update registrant status
      batch.update(regDoc.ref, {
        status: 'auto_approved',
        verifiedAt: FieldValue.serverTimestamp(),
      });

      // Mark bank transaction as matched
      batch.update(txRef, {
        matchedRegistrantId: regDoc.id,
      });

      // Generate ticket QR code
      const qrToken = signTicket(regDoc.id);
      const qrDataUrl = await generateQrCodeDataUrl(regDoc.id);

      const ticketRef = db.collection('tickets').doc(regDoc.id);
      batch.set(ticketRef, {
        qrToken,
        qrImageUrl: qrDataUrl,
        used: false,
        usedAt: null,
        usedByUsherId: null,
        createdAt: FieldValue.serverTimestamp(),
      });

      await batch.commit();
      matched++;
    }

    return NextResponse.json({
      success: true,
      reviewed,
      matched,
      duplicates,
      message: `Reconciliation complete: ${matched} matched, ${duplicates} duplicates, ${reviewed} reviewed`,
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

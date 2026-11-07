-- Med Spa's writers cap refunds, gift-card balances, package value and stock, but the database only
-- checked ProviderSchedule shapes and a logo hue. These back the writers. Fails closed on existing
-- violations; nothing is rewritten.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Payment" WHERE "subtotal" < 0 OR coalesce("tax", 0) < 0 OR coalesce("tip", 0) < 0 OR coalesce("discount", 0) < 0 OR "totalAmount" < 0 OR coalesce("refundedAmount", 0) < 0 OR coalesce("refundedAmount", 0) > "totalAmount") THEN RAISE EXCEPTION 'Payments with negative amounts or refunded beyond their total require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "PaymentSession" WHERE "amount" < 0) OR EXISTS (SELECT 1 FROM "Refund" WHERE "amountMinor" <= 0) THEN RAISE EXCEPTION 'Negative payment sessions or non-positive refunds require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "PaymentSession" WHERE "providerReference" <> '' GROUP BY "provider", "providerReference" HAVING count(*) > 1) THEN RAISE EXCEPTION 'Two payment sessions share a processor reference; reconcile them first'; END IF;
  IF EXISTS (SELECT 1 FROM "GiftCard" WHERE "initialValue" < 0 OR "currentBalance" < 0 OR "currentBalance" > "initialValue") OR EXISTS (SELECT 1 FROM "GiftCardTransaction" WHERE "amount" <= 0) THEN RAISE EXCEPTION 'Gift cards outside 0..initial value require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "ClientPackage" WHERE "totalValue" < 0 OR "paidAmount" < 0 OR "paidAmount" > "totalValue" OR coalesce("usedValue", 0) < 0 OR coalesce("usedValue", 0) > "totalValue") OR EXISTS (SELECT 1 FROM "ClientPackageUsage" WHERE "valueUsed" < 0 OR coalesce("quantityUsed", 1) <= 0) THEN RAISE EXCEPTION 'Packages used or paid beyond their value require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "ClientPoints" WHERE "points" < 0) OR EXISTS (SELECT 1 FROM "ClientPoints" WHERE "client" IS NOT NULL GROUP BY "practice", "client" HAVING count(*) > 1) THEN RAISE EXCEPTION 'Negative or duplicate points records require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "MedSpaTransactionLineItem" WHERE "quantity" <= 0 OR "unitPrice" < 0 OR coalesce("discount", 0) < 0) OR EXISTS (SELECT 1 FROM "MedSpaTransaction" WHERE coalesce("tip", 0) < 0) OR EXISTS (SELECT 1 FROM "ProductSale" WHERE "total" < 0) OR EXISTS (SELECT 1 FROM "Commission" WHERE "saleAmount" < 0 OR "commissionAmount" < 0 OR "commissionRate" < 0) THEN RAISE EXCEPTION 'Sales or commissions with negative amounts require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "Appointment" WHERE ("endTime" IS NOT NULL AND "endTime" <= "startTime") OR coalesce("duration", 1) <= 0 OR coalesce("depositAmount", 0) < 0) OR EXISTS (SELECT 1 FROM "AppointmentLineItem" WHERE "duration" <= 0 OR "price" < 0 OR "quantity" <= 0) THEN RAISE EXCEPTION 'Appointments with backwards times or negative money require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "AppointmentResourceReservation" WHERE "units" <= 0 OR "endsAt" <= "startsAt") OR EXISTS (SELECT 1 FROM "ResourceScheduleBlock" WHERE "endsAt" <= "startsAt") THEN RAISE EXCEPTION 'Reservations or blocks that end before they start require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "InventoryLot" WHERE "receivedQuantity" < 0 OR "remainingQuantity" < 0 OR "remainingQuantity" > "receivedQuantity") OR EXISTS (SELECT 1 FROM "InventoryMovement" WHERE "balanceAfter" < 0 OR "balanceAfter" <> "balanceBefore" + "delta") OR EXISTS (SELECT 1 FROM "StockMovement" WHERE "balanceAfter" < 0 OR "balanceAfter" <> "balanceBefore" + "delta") OR EXISTS (SELECT 1 FROM "PurchaseOrderLine" WHERE "orderedQuantity" <= 0 OR coalesce("receivedQuantity", 0) < 0 OR "unitCostMinor" < 0) OR EXISTS (SELECT 1 FROM "GoodsReceiptLine" WHERE "quantity" <= 0) THEN RAISE EXCEPTION 'Stock rows with impossible quantities require manual remediation'; END IF;
  IF EXISTS (SELECT 1 FROM "Service" WHERE "price" < 0 OR "baseDuration" <= 0 OR coalesce("depositAmount", 0) < 0 OR coalesce("depositAmount", 0) > "price") OR EXISTS (SELECT 1 FROM "ServiceVariant" WHERE "price" < 0 OR coalesce("duration", 1) <= 0) OR EXISTS (SELECT 1 FROM "Membership" WHERE "monthlyPrice" < 0 OR coalesce("discountPercent", 0) NOT BETWEEN 0 AND 100) OR EXISTS (SELECT 1 FROM "ServicePackage" WHERE "totalPrice" < 0) OR EXISTS (SELECT 1 FROM "Product" WHERE "price" < 0 OR coalesce("cost", 0) < 0) THEN RAISE EXCEPTION 'Catalog prices out of range require manual remediation'; END IF;
END $$;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amounts_and_refund_check" CHECK ("subtotal" >= 0 AND coalesce("tax", 0) >= 0 AND coalesce("tip", 0) >= 0 AND coalesce("discount", 0) >= 0 AND "totalAmount" >= 0 AND coalesce("refundedAmount", 0) BETWEEN 0 AND "totalAmount");
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_amount_nonnegative_check" CHECK ("amount" >= 0);
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive_check" CHECK ("amountMinor" > 0);
-- The webhook settles a checkout only when exactly one session carries the processor reference.
CREATE UNIQUE INDEX "PaymentSession_provider_reference_key" ON "PaymentSession" ("provider", "providerReference") WHERE "providerReference" <> '';
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_balance_range_check" CHECK ("initialValue" >= 0 AND "currentBalance" BETWEEN 0 AND "initialValue");
ALTER TABLE "GiftCardTransaction" ADD CONSTRAINT "GiftCardTransaction_amount_positive_check" CHECK ("amount" > 0);
ALTER TABLE "ClientPackage" ADD CONSTRAINT "ClientPackage_value_range_check" CHECK ("totalValue" >= 0 AND "paidAmount" BETWEEN 0 AND "totalValue" AND coalesce("usedValue", 0) BETWEEN 0 AND "totalValue");
ALTER TABLE "ClientPackageUsage" ADD CONSTRAINT "ClientPackageUsage_positive_check" CHECK ("valueUsed" >= 0 AND coalesce("quantityUsed", 1) > 0);
ALTER TABLE "ClientPoints" ADD CONSTRAINT "ClientPoints_nonnegative_check" CHECK ("points" >= 0);
CREATE UNIQUE INDEX "ClientPoints_practice_client_key" ON "ClientPoints" ("practice", "client") WHERE "client" IS NOT NULL;
ALTER TABLE "MedSpaTransactionLineItem" ADD CONSTRAINT "MedSpaTransactionLineItem_quantity_money_check" CHECK ("quantity" > 0 AND "unitPrice" >= 0 AND coalesce("discount", 0) >= 0);
ALTER TABLE "MedSpaTransaction" ADD CONSTRAINT "MedSpaTransaction_tip_nonnegative_check" CHECK (coalesce("tip", 0) >= 0);
ALTER TABLE "ProductSale" ADD CONSTRAINT "ProductSale_total_nonnegative_check" CHECK ("total" >= 0);
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_amounts_nonnegative_check" CHECK ("saleAmount" >= 0 AND "commissionAmount" >= 0 AND "commissionRate" >= 0);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_time_and_deposit_check" CHECK (("endTime" IS NULL OR "endTime" > "startTime") AND coalesce("duration", 1) > 0 AND coalesce("depositAmount", 0) >= 0);
ALTER TABLE "AppointmentLineItem" ADD CONSTRAINT "AppointmentLineItem_positive_check" CHECK ("duration" > 0 AND "price" >= 0 AND "quantity" > 0);
ALTER TABLE "AppointmentResourceReservation" ADD CONSTRAINT "AppointmentResourceReservation_window_check" CHECK ("units" > 0 AND "endsAt" > "startsAt");
ALTER TABLE "ResourceScheduleBlock" ADD CONSTRAINT "ResourceScheduleBlock_window_check" CHECK ("endsAt" > "startsAt");
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_quantity_range_check" CHECK ("receivedQuantity" >= 0 AND "remainingQuantity" BETWEEN 0 AND "receivedQuantity");
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_balance_check" CHECK ("balanceAfter" >= 0 AND "balanceAfter" = "balanceBefore" + "delta");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_balance_check" CHECK ("balanceAfter" >= 0 AND "balanceAfter" = "balanceBefore" + "delta");
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_quantity_cost_check" CHECK ("orderedQuantity" > 0 AND coalesce("receivedQuantity", 0) >= 0 AND "unitCostMinor" >= 0);
ALTER TABLE "GoodsReceiptLine" ADD CONSTRAINT "GoodsReceiptLine_quantity_positive_check" CHECK ("quantity" > 0);
ALTER TABLE "Service" ADD CONSTRAINT "Service_price_duration_deposit_check" CHECK ("price" >= 0 AND "baseDuration" > 0 AND coalesce("depositAmount", 0) BETWEEN 0 AND "price");
ALTER TABLE "ServiceVariant" ADD CONSTRAINT "ServiceVariant_price_duration_check" CHECK ("price" >= 0 AND coalesce("duration", 1) > 0);
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_price_discount_check" CHECK ("monthlyPrice" >= 0 AND coalesce("discountPercent", 0) BETWEEN 0 AND 100);
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_price_nonnegative_check" CHECK ("totalPrice" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_cost_nonnegative_check" CHECK ("price" >= 0 AND coalesce("cost", 0) >= 0);

-- AlterTable
ALTER TABLE "_Appointment_services" ADD CONSTRAINT "_Appointment_services_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_Appointment_services_AB_unique";

-- AlterTable
ALTER TABLE "_FormTemplate_requiredForCategories" ADD CONSTRAINT "_FormTemplate_requiredForCategories_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_FormTemplate_requiredForCategories_AB_unique";

-- AlterTable
ALTER TABLE "_IntakeForm_requiredForServices" ADD CONSTRAINT "_IntakeForm_requiredForServices_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_IntakeForm_requiredForServices_AB_unique";

-- AlterTable
ALTER TABLE "_Location_providers" ADD CONSTRAINT "_Location_providers_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_Location_providers_AB_unique";

-- AlterTable
ALTER TABLE "_Location_staff" ADD CONSTRAINT "_Location_staff_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_Location_staff_AB_unique";

-- AlterTable
ALTER TABLE "_Membership_includedServices" ADD CONSTRAINT "_Membership_includedServices_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_Membership_includedServices_AB_unique";

-- AlterTable
ALTER TABLE "_PracticeMembership_locations" ADD CONSTRAINT "_PracticeMembership_locations_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_PracticeMembership_locations_AB_unique";

-- AlterTable
ALTER TABLE "_Provider_specializations" ADD CONSTRAINT "_Provider_specializations_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_Provider_specializations_AB_unique";

-- AlterTable
ALTER TABLE "_Provider_waitlistEntries" ADD CONSTRAINT "_Provider_waitlistEntries_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_Provider_waitlistEntries_AB_unique";

-- AlterTable
ALTER TABLE "_Resource_services" ADD CONSTRAINT "_Resource_services_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_Resource_services_AB_unique";

-- AlterTable
ALTER TABLE "_ServicePackage_services" ADD CONSTRAINT "_ServicePackage_services_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ServicePackage_services_AB_unique";

-- AlterTable
ALTER TABLE "_Service_clinicalProducts" ADD CONSTRAINT "_Service_clinicalProducts_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_Service_clinicalProducts_AB_unique";

-- AlterTable
ALTER TABLE "_StaffInvitation_locations" ADD CONSTRAINT "_StaffInvitation_locations_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_StaffInvitation_locations_AB_unique";


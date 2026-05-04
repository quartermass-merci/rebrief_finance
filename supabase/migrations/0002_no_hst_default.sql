-- Rebrief is a registered non-profit under the Small Supplier threshold
-- and is NOT HST-registered. Default invoice tax_rate to 0% instead of 13%.
-- Existing rows are NOT modified — they keep whatever rate they were saved
-- with. Only the column default for new inserts changes.

alter table invoices
  alter column tax_rate set default 0;

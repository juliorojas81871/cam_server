import { pgTable, serial, text, numeric, integer, date, boolean } from 'drizzle-orm/pg-core';

export const buildings = pgTable('buildings', {
  id: serial('id').primaryKey(),
  locationCode: text('location_code'),
  realPropertyAssetName: text('real_property_asset_name'),
  installationName: text('installation_name'),
  ownedOrLeased: text('owned_or_leased'),
  gsaRegion: text('gsa_region'),
  streetAddress: text('street_address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  buildingRentableSquareFeet: numeric('building_rentable_square_feet'),
  availableSquareFeet: numeric('available_square_feet', { precision: 10, scale: 0 }).default(0),
  constructionDate: text('construction_date'),
  congressionalDistrict: text('congressional_district'),
  congressionalDistrictRepresentativeName: text('congressional_district_representative_name'),
  buildingStatus: text('building_status'),
  realPropertyAssetType: text('real_property_asset_type'),
  
  // Data cleansing fields
  cleanedBuildingName: text('cleaned_building_name'),
  addressInName: boolean('address_in_name').default(false),
});

export const leases = pgTable('leases', {
  id: serial('id').primaryKey(),
  locationCode: text('location_code'),
  realPropertyAssetName: text('real_property_asset_name'),
  installationName: text('installation_name'),
  federalLeasedCode: text('federal_leased_code'),
  gsaRegion: text('gsa_region'),
  streetAddress: text('street_address'),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  buildingRentableSquareFeet: numeric('building_rentable_square_feet'),
  availableSquareFeet: numeric('available_square_feet', { precision: 10, scale: 0 }).default(0),
  constructionDate: text('construction_date'),
  congressionalDistrict: text('congressional_district'),
  congressionalDistrictRepresentative: text('congressional_district_representative'),
  leaseNumber: text('lease_number'),
  leaseEffectiveDate: text('lease_effective_date'),
  leaseExpirationDate: text('lease_expiration_date'),
  realPropertyAssetType: text('real_property_asset_type'),
  
  // Data cleansing fields
  cleanedBuildingName: text('cleaned_building_name'),
  addressInName: boolean('address_in_name').default(false),
}); 
// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 03: Farmer Management DTO Specification
// ============================================================================

import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';

export class RegisterFarmerDto {
  @IsString()
  @IsNotEmpty()
  firstNameEn: string;

  @IsString()
  @IsNotEmpty()
  lastNameEn: string;

  @IsString()
  @IsOptional()
  firstNameMr?: string;

  @IsString()
  @IsOptional()
  lastNameMr?: string;

  @IsString()
  @IsNotEmpty()
  mobileNumber: string;

  @IsString()
  @IsNotEmpty()
  gender: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsNotEmpty()
  districtId: string;

  @IsString()
  @IsNotEmpty()
  talukaId: string;

  @IsString()
  @IsNotEmpty()
  villageId: string;
}

export class AddLandParcelDto {
  @IsString()
  @IsNotEmpty()
  farmerId: string;

  @IsString()
  @IsNotEmpty()
  surveyGatNumber: string;

  @IsNumber()
  @Min(0.1)
  totalAreaAcres: number;

  @IsNumber()
  @Min(0.1)
  cultivableAreaAcres: number;

  @IsString()
  @IsOptional()
  soilType?: string;
}

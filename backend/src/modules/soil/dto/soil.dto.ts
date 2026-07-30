// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Module 04: Soil Testing System DTO Specification
// ============================================================================

import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class RegisterSoilSampleDto {
  @IsString()
  @IsNotEmpty()
  farmerId: string;

  @IsString()
  @IsNotEmpty()
  landParcelId: string;

  @IsNumber()
  gpsLatitude: number;

  @IsNumber()
  gpsLongitude: number;
}

export class ParameterEntryDto {
  @IsString()
  @IsNotEmpty()
  parameterCode: string; // pH, EC, OC, N, P, K, S, Zn, Fe, Cu, Mn, B

  @IsNumber()
  measuredValue: number;
}

export class EnterTestResultsDto {
  @IsString()
  @IsNotEmpty()
  sampleCode: string;

  @IsString()
  @IsNotEmpty()
  laboratoryId: string;

  parameters: ParameterEntryDto[];
}

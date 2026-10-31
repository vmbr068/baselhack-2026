import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'owner@hotelbasel.ch',
    description: 'Business owner email address',
  })
  email!: string;

  @ApiProperty({
    example: 'basel2026',
    description: 'Account password',
  })
  password!: string;
}

export class RegisterDto {
  @ApiProperty({
    example: 'owner@hotelbasel.ch',
    description: 'Business owner email address',
  })
  email!: string;

  @ApiProperty({
    example: 'basel2026',
    description: 'Account password',
    minLength: 6,
  })
  password!: string;

  @ApiProperty({
    example: 'Beatrix Meier',
    description: 'Full name of the business owner',
  })
  fullName!: string;

  @ApiPropertyOptional({
    example: 'Grand Hotel Basel',
    description: 'Company or property name',
  })
  company?: string;
}

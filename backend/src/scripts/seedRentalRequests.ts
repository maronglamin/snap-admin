import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRentalRequests() {
  try {
    console.log('🌱 Seeding rental requests...');

    // Get some existing users and ride services
    const users = await prisma.user.findMany({ take: 5 });
    const rideServices = await prisma.rideService.findMany({ take: 3 });
    const drivers = await prisma.driver.findMany({ take: 3 });

    if (users.length === 0) {
      console.log('❌ No users found. Please seed users first.');
      return;
    }

    if (rideServices.length === 0) {
      console.log('❌ No ride services found. Please seed ride services first.');
      return;
    }

    const sampleRentalRequests = [
      {
        requestId: 'RENTAL-001',
        customerId: users[0].id,
        driverId: drivers.length > 0 ? drivers[0].id : undefined,
        rideServiceId: rideServices[0].id,
        status: 'PENDING_QUOTE',
        pickupAddress: '123 Main Street, Banjul, The Gambia',
        pickupLocation: { latitude: 13.4432, longitude: -16.5919 },
        pickupLatitude: 13.4432,
        pickupLongitude: -16.5919,
        startDate: new Date('2024-08-25T08:00:00Z'),
        endDate: new Date('2024-08-27T18:00:00Z'),
        days: 3,
        proposedPrice: 1500.00,
        agreedPrice: null,
        currency: 'GMD',
        notes: 'Customer needs vehicle for business trip',
      },
      {
        requestId: 'RENTAL-002',
        customerId: users[1]?.id || users[0].id,
        driverId: drivers.length > 1 ? drivers[1].id : undefined,
        rideServiceId: rideServices[1]?.id || rideServices[0].id,
        status: 'ACCEPTED',
        pickupAddress: '456 Coastal Road, Serekunda, The Gambia',
        pickupLocation: { latitude: 13.4383, longitude: -16.6781 },
        pickupLatitude: 13.4383,
        pickupLongitude: -16.6781,
        startDate: new Date('2024-08-26T10:00:00Z'),
        endDate: new Date('2024-08-28T16:00:00Z'),
        days: 2,
        proposedPrice: 1200.00,
        agreedPrice: 1100.00,
        currency: 'GMD',
        notes: 'Weekend family trip',
      },
      {
        requestId: 'RENTAL-003',
        customerId: users[2]?.id || users[0].id,
        driverId: undefined,
        rideServiceId: rideServices[2]?.id || rideServices[0].id,
        status: 'QUOTED',
        pickupAddress: '789 Airport Road, Yundum, The Gambia',
        pickupLocation: { latitude: 13.3377, longitude: -16.6520 },
        pickupLatitude: 13.3377,
        pickupLongitude: -16.6520,
        startDate: new Date('2024-08-29T06:00:00Z'),
        endDate: new Date('2024-09-02T20:00:00Z'),
        days: 4,
        proposedPrice: 2500.00,
        agreedPrice: null,
        currency: 'GMD',
        notes: 'Airport pickup and extended rental',
      },
      {
        requestId: 'RENTAL-004',
        customerId: users[3]?.id || users[0].id,
        driverId: drivers.length > 2 ? drivers[2].id : undefined,
        rideServiceId: rideServices[0].id,
        status: 'PAID',
        pickupAddress: '321 Tourist Street, Kololi, The Gambia',
        pickupLocation: { latitude: 13.4567, longitude: -16.6789 },
        pickupLatitude: 13.4567,
        pickupLongitude: -16.6789,
        startDate: new Date('2024-08-20T09:00:00Z'),
        endDate: new Date('2024-08-22T17:00:00Z'),
        days: 2,
        proposedPrice: 1800.00,
        agreedPrice: 1700.00,
        currency: 'GMD',
        notes: 'Tourist rental - completed',
      },
      {
        requestId: 'RENTAL-005',
        customerId: users[4]?.id || users[0].id,
        driverId: undefined,
        rideServiceId: rideServices[1]?.id || rideServices[0].id,
        status: 'CANCELLED',
        pickupAddress: '555 Business District, Kanifing, The Gambia',
        pickupLocation: { latitude: 13.4432, longitude: -16.6781 },
        pickupLatitude: 13.4432,
        pickupLongitude: -16.6781,
        startDate: new Date('2024-08-30T08:00:00Z'),
        endDate: new Date('2024-09-01T18:00:00Z'),
        days: 2,
        proposedPrice: 1600.00,
        agreedPrice: null,
        currency: 'GMD',
        notes: 'Cancelled due to schedule conflict',
      },
    ];

    for (const requestData of sampleRentalRequests) {
      await prisma.rentalRequest.create({
        data: {
          requestId: requestData.requestId,
          customerId: requestData.customerId,
          rideServiceId: requestData.rideServiceId,
          status: requestData.status as any,
          pickupAddress: requestData.pickupAddress,
          pickupLocation: requestData.pickupLocation,
          pickupLatitude: requestData.pickupLatitude,
          pickupLongitude: requestData.pickupLongitude,
          startDate: requestData.startDate,
          endDate: requestData.endDate,
          days: requestData.days,
          proposedPrice: requestData.proposedPrice,
          agreedPrice: requestData.agreedPrice,
          currency: requestData.currency,
          notes: requestData.notes,
          ...(requestData.driverId && { driverId: requestData.driverId }),
        },
      });
    }

    console.log('✅ Rental requests seeded successfully!');
    console.log(`📊 Created ${sampleRentalRequests.length} rental requests`);

  } catch (error) {
    console.error('❌ Error seeding rental requests:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedRentalRequests();

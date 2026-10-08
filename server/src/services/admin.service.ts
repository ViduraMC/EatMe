import bcrypt from 'bcryptjs';
import PDFDocument from 'pdfkit';

import { prisma } from '../config/prisma';
import { ApiError } from '../utils/apiError';

const ADMIN_STAFF_PASSWORD_ROUNDS = 10;

const adminUserSelect = {
  userId: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  role: true,
  organisationName: true,
  isAvailable: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      listings: true,
      requests: true,
      coordinatedAssignments: true,
      drivenAssignments: true,
    },
  },
} as const;

export interface CreateAdminStaffInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: 'coordinator' | 'driver';
}

export interface UpdateAdminStaffInput {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export type AdminReportType =
  'overall' | 'users' | 'donations' | 'requests' | 'deliveries';

export interface CreateAdminReportInput {
  adminId: number;
  title: string;
  type: AdminReportType;
  startDate: Date;
  endDate: Date;
}

export interface UpdateAdminReportInput {
  title: string;
}

export async function getAdminStats() {
  const [
    totalUsers,
    activeUsers,
    totalListings,
    openListings,
    totalRequests,
    pendingRequests,
    totalAssignments,
    completedAssignments,
  ] = await Promise.all([
    prisma.user.count(),

    prisma.user.count({
      where: {
        status: 'active',
      },
    }),

    prisma.donationListing.count(),

    prisma.donationListing.count({
      where: {
        status: 'open',
      },
    }),

    prisma.donationRequest.count(),

    prisma.donationRequest.count({
      where: {
        status: 'pending',
      },
    }),

    prisma.deliveryAssignment.count(),

    prisma.deliveryAssignment.count({
      where: {
        status: 'completed',
      },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
    },
    listings: {
      total: totalListings,
      open: openListings,
    },
    requests: {
      total: totalRequests,
      pending: pendingRequests,
    },
    assignments: {
      total: totalAssignments,
      completed: completedAssignments,
    },
  };
}

export async function getAdminListings() {
  return prisma.donationListing.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      donor: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          organisationName: true,
          status: true,
        },
      },
      _count: {
        select: {
          requests: true,
        },
      },
    },
  });
}

export async function getAdminRequests() {
  return prisma.donationRequest.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      recipient: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          organisationName: true,
          status: true,
        },
      },
      listing: {
        select: {
          listingId: true,
          title: true,
          status: true,
          pickupAddress: true,
          donor: {
            select: {
              userId: true,
              name: true,
              organisationName: true,
            },
          },
        },
      },
      items: {
        include: {
          item: {
            select: {
              itemId: true,
              foodName: true,
              unit: true,
            },
          },
        },
      },
      _count: {
        select: {
          assignments: true,
        },
      },
    },
  });
}

export async function getAdminAssignments() {
  return prisma.deliveryAssignment.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      coordinator: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      driver: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          isAvailable: true,
          status: true,
        },
      },
      request: {
        select: {
          requestId: true,
          status: true,
          recipient: {
            select: {
              userId: true,
              name: true,
              organisationName: true,
            },
          },
          listing: {
            select: {
              listingId: true,
              title: true,
              pickupAddress: true,
              donor: {
                select: {
                  userId: true,
                  name: true,
                  organisationName: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getAdminUsers() {
  return prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: adminUserSelect,
  });
}

export async function createAdminStaff(input: CreateAdminStaffInput) {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      userId: true,
    },
  });

  if (existing) {
    throw ApiError.conflict('An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, ADMIN_STAFF_PASSWORD_ROUNDS);

  return prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash,
      phone: input.phone.trim(),
      address: input.address.trim(),
      role: input.role,
      status: 'active',
      isAvailable: input.role === 'driver',
    },
    select: adminUserSelect,
  });
}

export async function updateAdminStaff(userId: number, input: UpdateAdminStaffInput) {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      userId: true,
      role: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role !== 'coordinator' && user.role !== 'driver') {
    throw ApiError.conflict(
      'Only coordinator and driver accounts can be edited by an administrator',
    );
  }

  const email = input.email.trim().toLowerCase();

  const existingEmail = await prisma.user.findFirst({
    where: {
      email,
      NOT: {
        userId,
      },
    },
    select: {
      userId: true,
    },
  });

  if (existingEmail) {
    throw ApiError.conflict('An account with that email already exists');
  }

  return prisma.user.update({
    where: {
      userId,
    },
    data: {
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      address: input.address.trim(),
    },
    select: adminUserSelect,
  });
}

export async function cancelAdminListing(listingId: number) {
  const listing = await prisma.donationListing.findUnique({
    where: {
      listingId,
    },
    select: {
      listingId: true,
      status: true,
    },
  });

  if (!listing) {
    throw ApiError.notFound('Donation listing not found');
  }

  if (listing.status === 'cancelled') {
    throw ApiError.conflict('This donation listing is already cancelled');
  }

  if (listing.status !== 'open') {
    throw ApiError.conflict(
      'Only open donation listings can be cancelled by an administrator',
    );
  }

  return prisma.donationListing.update({
    where: {
      listingId,
    },
    data: {
      status: 'cancelled',
    },
    include: {
      donor: {
        select: {
          userId: true,
          name: true,
          email: true,
          phone: true,
          organisationName: true,
          status: true,
        },
      },
      _count: {
        select: {
          requests: true,
        },
      },
    },
  });
}

export async function deleteAdminStaff(userId: number) {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      userId: true,
      name: true,
      role: true,
      _count: {
        select: {
          coordinatedAssignments: true,
          drivenAssignments: true,
        },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role !== 'coordinator' && user.role !== 'driver') {
    throw ApiError.conflict(
      'Only coordinator and driver accounts can be permanently deleted',
    );
  }

  const assignmentCount =
    user.role === 'coordinator'
      ? user._count.coordinatedAssignments
      : user._count.drivenAssignments;

  if (assignmentCount > 0) {
    throw ApiError.conflict(
      'This staff account has assignment history and cannot be permanently deleted. Deactivate the account instead.',
    );
  }

  await prisma.user.delete({
    where: {
      userId,
    },
  });

  return {
    userId: user.userId,
    name: user.name,
    role: user.role,
  };
}

export async function updateAdminUserStatus(
  userId: number,
  status: 'pending' | 'active' | 'inactive' | 'rejected',
) {
  const user = await prisma.user.findUnique({
    where: {
      userId,
    },
    select: {
      userId: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.role === 'admin') {
    throw ApiError.conflict('Administrator account status cannot be changed here');
  }

  if (status === 'pending') {
    throw ApiError.conflict('A user cannot be manually returned to pending status');
  }

  if (status === 'rejected') {
    if (user.role !== 'recipient') {
      throw ApiError.conflict('Only recipient registrations can be rejected');
    }

    if (user.status !== 'pending') {
      throw ApiError.conflict('Only pending recipient registrations can be rejected');
    }
  }

  if (user.status === 'pending' && status === 'inactive') {
    throw ApiError.conflict('A pending recipient must be approved or rejected first');
  }

  if (user.status === 'rejected' && status === 'inactive') {
    throw ApiError.conflict('A rejected recipient cannot be deactivated');
  }

  if (user.status === status) {
    throw ApiError.conflict(`This user is already ${status}`);
  }

  return prisma.user.update({
    where: {
      userId,
    },
    data: {
      status,
    },
    select: adminUserSelect,
  });
}

function reportDateFilter(startDate: Date, endDate: Date) {
  return {
    gte: startDate,
    lte: endDate,
  };
}

async function generateReportData(type: AdminReportType, startDate: Date, endDate: Date) {
  const createdAt = reportDateFilter(startDate, endDate);

  if (type === 'users') {
    const [total, admin, coordinator, donor, recipient, driver, active, pending] =
      await Promise.all([
        prisma.user.count({ where: { createdAt } }),
        prisma.user.count({ where: { role: 'admin', createdAt } }),
        prisma.user.count({ where: { role: 'coordinator', createdAt } }),
        prisma.user.count({ where: { role: 'donor', createdAt } }),
        prisma.user.count({ where: { role: 'recipient', createdAt } }),
        prisma.user.count({ where: { role: 'driver', createdAt } }),
        prisma.user.count({ where: { status: 'active', createdAt } }),
        prisma.user.count({ where: { status: 'pending', createdAt } }),
      ]);

    return {
      total,
      byRole: {
        admin,
        coordinator,
        donor,
        recipient,
        driver,
      },
      byStatus: {
        active,
        pending,
      },
    };
  }

  if (type === 'donations') {
    const [total, open, partiallyClaimed, fullyClaimed, expired, cancelled] =
      await Promise.all([
        prisma.donationListing.count({ where: { createdAt } }),
        prisma.donationListing.count({ where: { status: 'open', createdAt } }),
        prisma.donationListing.count({
          where: { status: 'partially_claimed', createdAt },
        }),
        prisma.donationListing.count({
          where: { status: 'fully_claimed', createdAt },
        }),
        prisma.donationListing.count({ where: { status: 'expired', createdAt } }),
        prisma.donationListing.count({
          where: { status: 'cancelled', createdAt },
        }),
      ]);

    return {
      total,
      byStatus: {
        open,
        partiallyClaimed,
        fullyClaimed,
        expired,
        cancelled,
      },
    };
  }

  if (type === 'requests') {
    const [total, pending, accepted, rejected, cancelled] = await Promise.all([
      prisma.donationRequest.count({ where: { createdAt } }),
      prisma.donationRequest.count({ where: { status: 'pending', createdAt } }),
      prisma.donationRequest.count({ where: { status: 'accepted', createdAt } }),
      prisma.donationRequest.count({ where: { status: 'rejected', createdAt } }),
      prisma.donationRequest.count({ where: { status: 'cancelled', createdAt } }),
    ]);

    return {
      total,
      byStatus: {
        pending,
        accepted,
        rejected,
        cancelled,
      },
    };
  }

  if (type === 'deliveries') {
    const [total, pendingDriver, accepted, declined, inTransit, completed, cancelled] =
      await Promise.all([
        prisma.deliveryAssignment.count({ where: { createdAt } }),
        prisma.deliveryAssignment.count({
          where: { status: 'pending_driver', createdAt },
        }),
        prisma.deliveryAssignment.count({
          where: { status: 'accepted', createdAt },
        }),
        prisma.deliveryAssignment.count({
          where: { status: 'declined', createdAt },
        }),
        prisma.deliveryAssignment.count({
          where: { status: 'in_transit', createdAt },
        }),
        prisma.deliveryAssignment.count({
          where: { status: 'completed', createdAt },
        }),
        prisma.deliveryAssignment.count({
          where: { status: 'cancelled', createdAt },
        }),
      ]);

    return {
      total,
      byStatus: {
        pendingDriver,
        accepted,
        declined,
        inTransit,
        completed,
        cancelled,
      },
    };
  }

  const [users, donations, requests, deliveries] = await Promise.all([
    prisma.user.count({ where: { createdAt } }),
    prisma.donationListing.count({ where: { createdAt } }),
    prisma.donationRequest.count({ where: { createdAt } }),
    prisma.deliveryAssignment.count({ where: { createdAt } }),
  ]);

  return {
    users,
    donations,
    requests,
    deliveries,
  };
}

export async function createAdminReport(input: CreateAdminReportInput) {
  if (input.startDate > input.endDate) {
    throw ApiError.conflict('Start date cannot be after end date');
  }

  const data = await generateReportData(input.type, input.startDate, input.endDate);

  return prisma.report.create({
    data: {
      adminId: input.adminId,
      title: input.title.trim(),
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
      data,
      status: 'draft',
    },
  });
}

export async function getAdminReports(adminId: number) {
  return prisma.report.findMany({
    where: {
      adminId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getDeletedAdminReports(adminId: number) {
  return prisma.report.findMany({
    where: {
      adminId,
      deletedAt: {
        not: null,
      },
    },
    orderBy: {
      deletedAt: 'desc',
    },
  });
}

export async function getAdminReport(adminId: number, reportId: number) {
  const report = await prisma.report.findFirst({
    where: {
      reportId,
      adminId,
      deletedAt: null,
    },
  });

  if (!report) {
    throw ApiError.notFound('Report not found');
  }

  return report;
}

export async function updateAdminReport(
  adminId: number,
  reportId: number,
  input: UpdateAdminReportInput,
) {
  const report = await getAdminReport(adminId, reportId);

  if (report.status === 'finalized') {
    throw ApiError.conflict('Finalized reports cannot be edited');
  }
  if (report.title.trim() === input.title.trim()) {
    throw ApiError.conflict('Report title has not changed');
  }

  return prisma.report.update({
    where: {
      reportId,
    },
    data: {
      title: input.title.trim(),
    },
  });
}

export async function finalizeAdminReport(adminId: number, reportId: number) {
  const report = await getAdminReport(adminId, reportId);

  if (report.status === 'finalized') {
    throw ApiError.conflict('Report is already finalized');
  }

  return prisma.report.update({
    where: {
      reportId,
    },
    data: {
      status: 'finalized',
      finalizedAt: new Date(),
    },
  });
}

export async function deleteAdminReport(adminId: number, reportId: number) {
  const report = await getAdminReport(adminId, reportId);

  await prisma.report.update({
    where: {
      reportId,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return {
    reportId: report.reportId,
    title: report.title,
  };
}

export async function restoreAdminReport(adminId: number, reportId: number) {
  const report = await prisma.report.findFirst({
    where: {
      reportId,
      adminId,
      deletedAt: {
        not: null,
      },
    },
  });

  if (!report) {
    throw ApiError.notFound('Deleted report not found');
  }

  return prisma.report.update({
    where: {
      reportId,
    },
    data: {
      deletedAt: null,
    },
  });
}

export async function permanentlyDeleteAdminReport(adminId: number, reportId: number) {
  const report = await prisma.report.findFirst({
    where: {
      reportId,
      adminId,
      deletedAt: {
        not: null,
      },
    },
  });

  if (!report) {
    throw ApiError.notFound('Deleted report not found');
  }

  await prisma.report.delete({
    where: {
      reportId,
    },
  });

  return {
    reportId: report.reportId,
    title: report.title,
  };
}

function formatReportPdfDate(value: Date): string {
  return value.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatReportPdfLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

const PDF_GREEN = '#2E9E55';
const PDF_DARK = '#1F2937';
const PDF_GREY = '#6B7280';
const PDF_LIGHT_GREY = '#F3F4F6';
const PDF_BORDER = '#D1D5DB';
const PDF_WHITE = '#FFFFFF';

function addPdfSectionTitle(document: PDFKit.PDFDocument, title: string) {
  document
    .moveDown(1)
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(PDF_DARK)
    .text(title);

  document
    .moveDown(0.25)
    .strokeColor(PDF_GREEN)
    .lineWidth(2)
    .moveTo(document.x, document.y)
    .lineTo(document.x + 45, document.y)
    .stroke();

  document.moveDown(0.6);
}

function addPdfTable(
  document: PDFKit.PDFDocument,
  rows: Array<[string, string | number]>,
  firstColumnTitle = 'Metric',
  secondColumnTitle = 'Count',
) {
  const startX = document.page.margins.left;
  let currentY = document.y;

  const tableWidth =
    document.page.width - document.page.margins.left - document.page.margins.right;

  const firstColumnWidth = tableWidth * 0.68;
  const secondColumnWidth = tableWidth - firstColumnWidth;
  const rowHeight = 28;

  const ensureSpace = () => {
    const bottomLimit = document.page.height - document.page.margins.bottom - 40;

    if (currentY + rowHeight > bottomLimit) {
      document.addPage();
      currentY = document.page.margins.top;
    }
  };

  ensureSpace();

  // Header
  document.rect(startX, currentY, tableWidth, rowHeight).fill(PDF_GREEN);

  document
    .fillColor(PDF_WHITE)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(firstColumnTitle, startX + 10, currentY + 9, {
      width: firstColumnWidth - 20,
    });

  document.text(secondColumnTitle, startX + firstColumnWidth + 10, currentY + 9, {
    width: secondColumnWidth - 20,
    align: 'right',
  });

  currentY += rowHeight;

  rows.forEach(([label, value], index) => {
    ensureSpace();

    if (index % 2 === 0) {
      document.rect(startX, currentY, tableWidth, rowHeight).fill(PDF_LIGHT_GREY);
    } else {
      document.rect(startX, currentY, tableWidth, rowHeight).fill(PDF_WHITE);
    }

    document
      .rect(startX, currentY, tableWidth, rowHeight)
      .strokeColor(PDF_BORDER)
      .lineWidth(0.5)
      .stroke();

    document
      .fillColor(PDF_DARK)
      .font('Helvetica')
      .fontSize(10)
      .text(label, startX + 10, currentY + 9, {
        width: firstColumnWidth - 20,
      });

    document
      .font('Helvetica-Bold')
      .text(String(value), startX + firstColumnWidth + 10, currentY + 9, {
        width: secondColumnWidth - 20,
        align: 'right',
      });

    currentY += rowHeight;
  });

  document.y = currentY;
}

function addReportDataToPdf(
  document: PDFKit.PDFDocument,
  data: Record<string, unknown>,
  reportType: AdminReportType,
) {
  if (reportType === 'overall') {
    addPdfSectionTitle(document, 'Platform Overview');

    addPdfTable(
      document,
      Object.entries(data).map(([key, value]) => [
        formatReportPdfLabel(key),
        String(value),
      ]),
      'Platform Metric',
      'Total',
    );

    return;
  }

  if ('total' in data) {
    addPdfSectionTitle(document, 'Report Summary');

    addPdfTable(document, [['Total', String(data.total)]], 'Metric', 'Count');
  }

  for (const [key, value] of Object.entries(data)) {
    if (key === 'total') {
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      addPdfSectionTitle(document, formatReportPdfLabel(key));

      const rows = Object.entries(value as Record<string, unknown>).map(
        ([nestedKey, nestedValue]) =>
          [formatReportPdfLabel(nestedKey), String(nestedValue)] as [string, string],
      );

      addPdfTable(document, rows, 'Category', 'Count');

      continue;
    }

    addPdfSectionTitle(document, formatReportPdfLabel(key));

    addPdfTable(
      document,
      [[formatReportPdfLabel(key), String(value)]],
      'Metric',
      'Value',
    );
  }
}

export async function generateAdminReportPdf(
  adminId: number,
  reportId: number,
): Promise<Buffer> {
  const report = await getAdminReport(adminId, reportId);

  // Keep the existing business rule:
  // only finalized reports can be downloaded.
  if (report.status !== 'finalized') {
    throw ApiError.conflict('Only finalized reports can be downloaded');
  }

  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 55,
        left: 50,
        right: 50,
      },
      info: {
        Title: report.title,
        Author: 'EatMe',
        Subject: 'Administrative Report',
      },
    });

    const chunks: Buffer[] = [];

    document.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    document.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    document.on('error', reject);

    const pageWidth = document.page.width;
    const contentWidth =
      pageWidth - document.page.margins.left - document.page.margins.right;

    // -------------------------------------------------
    // EatMe report header
    // -------------------------------------------------

    document.font('Helvetica-Bold').fontSize(24).fillColor(PDF_GREEN).text('EatMe');

    document
      .moveDown(0.1)
      .font('Helvetica')
      .fontSize(10)
      .fillColor(PDF_GREY)
      .text('ADMINISTRATION SYSTEM');

    document
      .moveDown(0.6)
      .strokeColor(PDF_GREEN)
      .lineWidth(2)
      .moveTo(document.page.margins.left, document.y)
      .lineTo(pageWidth - document.page.margins.right, document.y)
      .stroke();

    // -------------------------------------------------
    // Report title
    // -------------------------------------------------

    document
      .moveDown(1.2)
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(PDF_DARK)
      .text(report.title);

    document
      .moveDown(0.25)
      .font('Helvetica')
      .fontSize(10)
      .fillColor(PDF_GREY)
      .text('Administrative Report');

    // -------------------------------------------------
    // Finalized status badge
    // -------------------------------------------------

    const badgeWidth = 82;
    const badgeHeight = 24;
    const badgeX = pageWidth - document.page.margins.right - badgeWidth;
    const badgeY = document.y + 8;

    document.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 12).fill(PDF_GREEN);

    document
      .fillColor(PDF_WHITE)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('FINALIZED', badgeX, badgeY + 7, {
        width: badgeWidth,
        align: 'center',
      });

    document.moveDown(2);

    // -------------------------------------------------
    // Report information
    // -------------------------------------------------

    addPdfSectionTitle(document, 'Report Information');

    const informationRows: Array<[string, string]> = [
      ['Report Type', report.type.toUpperCase()],
      [
        'Reporting Period',
        `${formatReportPdfDate(report.startDate)} - ${formatReportPdfDate(
          report.endDate,
        )}`,
      ],
      ['Status', 'FINALIZED'],
    ];

    if (report.finalizedAt) {
      informationRows.push(['Finalized Date', formatReportPdfDate(report.finalizedAt)]);
    }

    addPdfTable(document, informationRows, 'Report Detail', 'Information');

    // -------------------------------------------------
    // Report-specific data
    // -------------------------------------------------

    const reportData =
      report.data && typeof report.data === 'object' && !Array.isArray(report.data)
        ? (report.data as Record<string, unknown>)
        : {};

    addReportDataToPdf(document, reportData, report.type as AdminReportType);

    // -------------------------------------------------
    // Footer
    // -------------------------------------------------

    const footerY = document.page.height - document.page.margins.bottom - 25;

    document
      .strokeColor(PDF_BORDER)
      .lineWidth(0.5)
      .moveTo(document.page.margins.left, footerY - 8)
      .lineTo(document.page.width - document.page.margins.right, footerY - 8)
      .stroke();

    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor(PDF_GREY)
      .text(
        'Generated by the EatMe Administration System',
        document.page.margins.left,
        footerY,
        {
          width: contentWidth,
          align: 'center',
          lineBreak: false,
        },
      );

    document.end();
  });
}

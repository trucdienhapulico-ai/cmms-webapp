const prisma = require('../lib/db');
const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

async function migrate() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('db.json not found at', DB_PATH);
    return;
  }

  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  console.log('--- Starting Migration ---');

  // 1. Users
  console.log('Migrating Users...');
  for (const item of db.users) {
    await prisma.user.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 2. Assets (Self-referencing, so we might need two passes or handle carefully)
  console.log('Migrating Assets...');
  for (const item of db.assets) {
    const { parentId, ...rest } = item;
    await prisma.asset.upsert({
      where: { id: item.id },
      update: { ...rest, parentId: parentId || null },
      create: { ...rest, parentId: parentId || null }
    });
  }

  // 3. Checklist Templates
  console.log('Migrating Checklist Templates...');
  for (const item of (db.checklistTemplates || [])) {
    await prisma.checklistTemplate.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 4. PM Schedules
  console.log('Migrating PM Schedules...');
  for (const item of (db.pmSchedules || [])) {
    await prisma.pmSchedule.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 5. Work Orders
  console.log('Migrating Work Orders...');
  for (const item of db.workOrders) {
    await prisma.workOrder.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 6. Checklists
  console.log('Migrating Checklists...');
  for (const item of (db.checklists || [])) {
    await prisma.checklist.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 7. Maintenance Logs
  console.log('Migrating Maintenance Logs...');
  for (const item of (db.maintenanceLogs || [])) {
    await prisma.maintenanceLog.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 8. Inventory
  console.log('Migrating Inventory...');
  for (const item of (db.inventory || [])) {
    await prisma.inventory.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 9. Inventory Transactions
  console.log('Migrating Inventory Transactions...');
  for (const item of (db.inventoryTx || [])) {
    await prisma.inventoryTx.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 10. Notifications
  console.log('Migrating Notifications...');
  for (const item of (db.notifications || [])) {
    await prisma.notification.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 11. Tenant Requests
  console.log('Migrating Tenant Requests...');
  for (const item of (db.tenantRequests || [])) {
    await prisma.tenantRequest.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 12. Shifts
  console.log('Migrating Shifts...');
  for (const item of (db.shifts || [])) {
    await prisma.shift.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 13. Audit Logs
  console.log('Migrating Audit Logs...');
  for (const item of (db.auditLogs || [])) {
    await prisma.auditLog.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 14. Vendors
  console.log('Migrating Vendors...');
  for (const item of (db.vendors || [])) {
    await prisma.vendor.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 15. Purchase Orders
  console.log('Migrating Purchase Orders...');
  for (const item of (db.purchaseOrders || [])) {
    await prisma.purchaseOrder.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 16. Webhooks
  console.log('Migrating Webhooks...');
  for (const item of (db.webhooks || [])) {
    await prisma.webhook.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 17. API Keys
  console.log('Migrating API Keys...');
  for (const item of (db.apiKeys || [])) {
    await prisma.apiKey.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }

  // 18. Settings (nextId)
  console.log('Migrating Settings (nextId)...');
  if (db.nextId) {
    await prisma.setting.upsert({
      where: { key: 'nextId' },
      update: { value: db.nextId },
      create: { key: 'nextId', value: db.nextId }
    });
  }

  console.log('--- Migration Completed Successfully ---');
}

migrate()
  .catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

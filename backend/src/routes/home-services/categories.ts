import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/permissions';

const router = express.Router();
const prisma = new PrismaClient();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

router.get('/', authenticate, requirePermission('SNAP_HOME_SERVICES_CATEGORIES', 'VIEW'), async (_req, res) => {
  try {
    const categories = await prisma.serviceCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    res.json({ categories });
  } catch (error) {
    console.error('Error fetching service categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/', authenticate, requirePermission('SNAP_HOME_SERVICES_CATEGORIES', 'ADD'), async (req, res) => {
  try {
    const { name, description, icon, sortOrder, isActive } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const slug = slugify(name);
    const category = await prisma.serviceCategory.create({
      data: {
        name: name.trim(),
        slug,
        description: description || null,
        icon: icon || null,
        sortOrder: sortOrder ?? 0,
        isActive: isActive !== false,
      },
    });
    res.status(201).json(category);
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(400).json({ error: 'Category name or slug already exists' });
    console.error('Error creating service category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.patch('/:id', authenticate, requirePermission('SNAP_HOME_SERVICES_CATEGORIES', 'EDIT'), async (req, res) => {
  try {
    const { name, description, icon, sortOrder, isActive } = req.body;
    const data: any = {};
    if (name !== undefined) {
      data.name = name.trim();
      data.slug = slugify(name);
    }
    if (description !== undefined) data.description = description || null;
    if (icon !== undefined) data.icon = icon || null;
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    const category = await prisma.serviceCategory.update({ where: { id: req.params.id }, data });
    res.json(category);
  } catch (error: any) {
    if (error?.code === 'P2025') return res.status(404).json({ error: 'Category not found' });
    console.error('Error updating service category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

export default router;

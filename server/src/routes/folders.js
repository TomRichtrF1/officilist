const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/folders
router.get('/', async (req, res) => {
  try {
    const folders = await prisma.folder.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Chyba při načítání složek.' });
  }
});

// GET /api/folders/:id
router.get('/:id', async (req, res) => {
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: req.params.id }
    });
    
    if (!folder) {
      return res.status(404).json({ error: 'Složka nenalezena.' });
    }
    
    res.json(folder);
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ error: 'Chyba při načítání složky.' });
  }
});

// POST /api/folders
router.post('/', async (req, res) => {
  try {
    const { name, type, color, icon, order } = req.body;
    
    const folder = await prisma.folder.create({
      data: { 
        name, 
        type, 
        color, 
        icon, 
        order: order || 0,
        isArchived: false
      }
    });
    
    res.status(201).json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Chyba při vytváření složky.' });
  }
});

// PATCH /api/folders/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name, type, color, icon, order, isArchived } = req.body;
    
    const folder = await prisma.folder.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(color && { color }),
        ...(icon && { icon }),
        ...(order !== undefined && { order }),
        ...(isArchived !== undefined && { isArchived })
      }
    });
    
    res.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: 'Chyba při aktualizaci složky.' });
  }
});

// DELETE /api/folders/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.folder.delete({
      where: { id: req.params.id }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Chyba při mazání složky.' });
  }
});

module.exports = router;

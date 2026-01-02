const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/persons
router.get('/', async (req, res) => {
  try {
    const { search, active } = req.query;
    
    const where = {};
    
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    
    if (active !== undefined) {
      where.isActive = active === 'true';
    }
    
    const persons = await prisma.person.findMany({
      where,
      orderBy: { name: 'asc' }
    });
    
    res.json(persons);
  } catch (error) {
    console.error('Error fetching persons:', error);
    res.status(500).json({ error: 'Chyba při načítání osob.' });
  }
});

// GET /api/persons/:id
router.get('/:id', async (req, res) => {
  try {
    const person = await prisma.person.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: {
          where: {
            status: { notIn: ['HOTOVO', 'ZRUSEN'] }
          },
          orderBy: { dueDate: 'asc' }
        }
      }
    });
    
    if (!person) {
      return res.status(404).json({ error: 'Osoba nenalezena.' });
    }
    
    res.json(person);
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Chyba při načítání osoby.' });
  }
});

// POST /api/persons
router.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Jméno je povinné.' });
    }
    
    const person = await prisma.person.create({
      data: { name, email, phone }
    });
    
    res.status(201).json(person);
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Chyba při vytváření osoby.' });
  }
});

// PATCH /api/persons/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name, email, phone, isActive } = req.body;
    
    const person = await prisma.person.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive })
      }
    });
    
    res.json(person);
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Chyba při aktualizaci osoby.' });
  }
});

// DELETE /api/persons/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.person.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting person:', error);
    res.status(500).json({ error: 'Chyba při mazání osoby.' });
  }
});

module.exports = router;

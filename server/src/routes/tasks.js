const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Helper: Log task change to history
async function logHistory(taskId, field, oldValue, newValue) {
  if (oldValue === newValue) return;
  
  await prisma.taskHistory.create({
    data: {
      taskId,
      field,
      oldValue: oldValue?.toString() || null,
      newValue: newValue?.toString()
    }
  });
}

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { folder, owner, status, from, to } = req.query;
    
    const where = {};
    
    if (folder) where.folderId = folder;
    if (owner) where.ownerId = owner;
    if (status) where.status = status;
    
    if (from || to) {
      where.dueDate = {};
      if (from) where.dueDate.gte = new Date(from);
      if (to) where.dueDate.lte = new Date(to);
    }
    
    const tasks = await prisma.task.findMany({
      where,
      include: {
        folder: true,
        owner: true,
        dependsOn: {
          include: {
            dependsOn: true
          }
        }
      },
      orderBy: [
        { isPriority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Chyba při načítání úkolů.' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        folder: true,
        owner: true,
        dependsOn: {
          include: {
            dependsOn: {
              include: {
                owner: true
              }
            }
          }
        },
        blockedBy: {
          include: {
            task: {
              include: {
                owner: true
              }
            }
          }
        }
      }
    });
    
    if (!task) {
      return res.status(404).json({ error: 'Úkol nenalezen.' });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Chyba při načítání úkolu.' });
  }
});

// GET /api/tasks/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const history = await prisma.taskHistory.findMany({
      where: { taskId: req.params.id },
      orderBy: { changedAt: 'desc' }
    });
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching task history:', error);
    res.status(500).json({ error: 'Chyba při načítání historie.' });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { 
      folderId, type, title, description, url, 
      ownerId, status, isPriority, dueDate, dependsOnIds 
    } = req.body;
    
    if (!folderId || !title) {
      return res.status(400).json({ error: 'Složka a název jsou povinné.' });
    }
    
    // Determine initial status
    let initialStatus = status || 'NOVY';
    if (ownerId && initialStatus === 'NOVY') {
      initialStatus = 'ZADANY';
    }
    
    const task = await prisma.task.create({
      data: {
        folderId,
        type: type || 'TASK',
        title,
        description,
        url,
        ownerId,
        status: initialStatus,
        isPriority: isPriority || false,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        folder: true,
        owner: true
      }
    });
    
    // Create dependencies if provided
    if (dependsOnIds && dependsOnIds.length > 0) {
      await prisma.taskDependency.createMany({
        data: dependsOnIds.map(depId => ({
          taskId: task.id,
          dependsOnId: depId
        }))
      });
    }
    
    // Log creation
    await logHistory(task.id, 'created', null, 'Úkol vytvořen');
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Chyba při vytváření úkolu.' });
  }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res) => {
  try {
    const { 
      folderId, type, title, description, url, 
      ownerId, status, isPriority, dueDate 
    } = req.body;
    
    // Get current task for history comparison
    const currentTask = await prisma.task.findUnique({
      where: { id: req.params.id }
    });
    
    if (!currentTask) {
      return res.status(404).json({ error: 'Úkol nenalezen.' });
    }
    
    // Build update data
    const updateData = {};
    
    if (folderId !== undefined) updateData.folderId = folderId;
    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (url !== undefined) updateData.url = url;
    if (isPriority !== undefined) updateData.isPriority = isPriority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    
    // Handle owner change - auto status update
    if (ownerId !== undefined) {
      updateData.ownerId = ownerId;
      if (ownerId && currentTask.status === 'NOVY') {
        updateData.status = 'ZADANY';
      }
    }
    
    // Handle status change
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'HOTOVO') {
        updateData.completedAt = new Date();
      } else if (currentTask.status === 'HOTOVO' && status !== 'HOTOVO') {
        updateData.completedAt = null;
      }
    }
    
    // Update task
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        folder: true,
        owner: true
      }
    });
    
    // Log changes to history
    if (folderId !== undefined && folderId !== currentTask.folderId) {
      await logHistory(task.id, 'folderId', currentTask.folderId, folderId);
    }
    if (title !== undefined && title !== currentTask.title) {
      await logHistory(task.id, 'title', currentTask.title, title);
    }
    if (ownerId !== undefined && ownerId !== currentTask.ownerId) {
      await logHistory(task.id, 'ownerId', currentTask.ownerId, ownerId);
    }
    if (updateData.status && updateData.status !== currentTask.status) {
      await logHistory(task.id, 'status', currentTask.status, updateData.status);
    }
    if (isPriority !== undefined && isPriority !== currentTask.isPriority) {
      await logHistory(task.id, 'isPriority', currentTask.isPriority, isPriority);
    }
    if (dueDate !== undefined) {
      const oldDate = currentTask.dueDate?.toISOString().split('T')[0];
      const newDate = dueDate ? new Date(dueDate).toISOString().split('T')[0] : null;
      if (oldDate !== newDate) {
        await logHistory(task.id, 'dueDate', oldDate, newDate);
      }
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Chyba při aktualizaci úkolu.' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.task.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Chyba při mazání úkolu.' });
  }
});

// POST /api/tasks/:id/dependencies
router.post('/:id/dependencies', async (req, res) => {
  try {
    const { dependsOnId } = req.body;
    
    const dependency = await prisma.taskDependency.create({
      data: {
        taskId: req.params.id,
        dependsOnId
      }
    });
    
    res.status(201).json(dependency);
  } catch (error) {
    console.error('Error creating dependency:', error);
    res.status(500).json({ error: 'Chyba při vytváření závislosti.' });
  }
});

// DELETE /api/tasks/:id/dependencies/:depId
router.delete('/:id/dependencies/:depId', async (req, res) => {
  try {
    await prisma.taskDependency.delete({
      where: { id: req.params.depId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting dependency:', error);
    res.status(500).json({ error: 'Chyba při mazání závislosti.' });
  }
});

module.exports = router;

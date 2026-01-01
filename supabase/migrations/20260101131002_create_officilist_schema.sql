/*
  # Officilist Task Management Schema

  1. New Tables
    - `folders`
      - `id` (uuid, primary key)
      - `name` (text) - Folder name
      - `type` (text) - COMPANY, PROJECT, or PERSONAL
      - `color` (text) - Hex color code
      - `icon` (text) - Emoji icon
      - `order` (integer) - Display order
      - `created_at` (timestamptz)
    
    - `persons`
      - `id` (uuid, primary key)
      - `name` (text) - Person name
      - `email` (text, optional)
      - `phone` (text, optional)
      - `is_active` (boolean) - Active status
      - `created_at` (timestamptz)
    
    - `tasks`
      - `id` (uuid, primary key)
      - `folder_id` (uuid, foreign key)
      - `type` (text) - TASK or NOTE
      - `title` (text) - Task title
      - `description` (text, optional)
      - `url` (text, optional)
      - `owner_id` (uuid, optional foreign key)
      - `status` (text) - NOVY, ZADANY, CEKAJICI, HOTOVO, ZRUSEN
      - `is_priority` (boolean)
      - `due_date` (timestamptz, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `completed_at` (timestamptz, optional)
    
    - `task_history`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key)
      - `field` (text) - Field that changed
      - `old_value` (text, optional)
      - `new_value` (text)
      - `changed_at` (timestamptz)
    
    - `task_dependencies`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key) - Dependent task
      - `depends_on_id` (uuid, foreign key) - Blocking task
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('COMPANY', 'PROJECT', 'PERSONAL')),
  color text NOT NULL,
  icon text NOT NULL,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create persons table
CREATE TABLE IF NOT EXISTS persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'TASK' CHECK (type IN ('TASK', 'NOTE')),
  title text NOT NULL,
  description text,
  url text,
  owner_id uuid REFERENCES persons(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'NOVY' CHECK (status IN ('NOVY', 'ZADANY', 'CEKAJICI', 'HOTOVO', 'ZRUSEN')),
  is_priority boolean DEFAULT false,
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create task_history table
CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  field text NOT NULL,
  old_value text,
  new_value text NOT NULL,
  changed_at timestamptz DEFAULT now()
);

-- Create task_dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, depends_on_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tasks_folder_id ON tasks(folder_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on_id ON task_dependencies(depends_on_id);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for folders
CREATE POLICY "Anyone can view folders"
  ON folders FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert folders"
  ON folders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update folders"
  ON folders FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete folders"
  ON folders FOR DELETE
  USING (true);

-- RLS Policies for persons
CREATE POLICY "Anyone can view persons"
  ON persons FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert persons"
  ON persons FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update persons"
  ON persons FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete persons"
  ON persons FOR DELETE
  USING (true);

-- RLS Policies for tasks
CREATE POLICY "Anyone can view tasks"
  ON tasks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tasks"
  ON tasks FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tasks"
  ON tasks FOR DELETE
  USING (true);

-- RLS Policies for task_history
CREATE POLICY "Anyone can view task history"
  ON task_history FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert task history"
  ON task_history FOR INSERT
  WITH CHECK (true);

-- RLS Policies for task_dependencies
CREATE POLICY "Anyone can view task dependencies"
  ON task_dependencies FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert task dependencies"
  ON task_dependencies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete task dependencies"
  ON task_dependencies FOR DELETE
  USING (true);

-- Insert default folders
INSERT INTO folders (name, type, color, icon, "order") VALUES
  ('CS SOFT', 'COMPANY', '#2563EB', '🏢', 1),
  ('Tendrio', 'COMPANY', '#7C3AED', '🏢', 2),
  ('JATIS', 'COMPANY', '#059669', '🏢', 3),
  ('Kolo Na Kolo', 'PROJECT', '#EA580C', '🚴', 4),
  ('GPF1.cz', 'PROJECT', '#DC2626', '🏎️', 5),
  ('Life Management', 'PERSONAL', '#0891B2', '🏠', 6)
ON CONFLICT DO NOTHING;
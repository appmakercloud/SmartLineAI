-- Create a test user directly in the database
-- Password: Test123! (bcrypt hash)

INSERT INTO users (id, email, password, subscription, credits, created_at)
VALUES (
  gen_random_uuid(),
  'ashok@flickmax.com',
  '$2a$10$VYKxrWLHzP6X5hqL7TfYn.qfu8Y3aZwms89eEkKpZGKdXPTJ6qCHO',
  'free',
  10,
  NOW()
) ON CONFLICT (email) DO UPDATE
SET password = '$2a$10$VYKxrWLHzP6X5hqL7TfYn.qfu8Y3aZwms89eEkKpZGKdXPTJ6qCHO';

-- Password is: Test123!
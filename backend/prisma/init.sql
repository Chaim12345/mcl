-- Initial database setup
-- This file is used by Docker to initialize the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database if it doesn't exist (handled by Docker environment variables)
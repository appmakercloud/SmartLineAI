#!/bin/bash

echo "🚀 SmartLine AI Setup Script"
echo "=========================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $(node -v)${NC}"

# Backend setup
echo -e "\n${YELLOW}Setting up backend...${NC}"
cd backend

# Install dependencies
echo "Installing dependencies..."
npm install

# Copy env file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please update .env with your actual credentials${NC}"
fi

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

echo -e "${GREEN}✅ Backend setup complete!${NC}"

# Return to root
cd ..

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Update backend/.env with your Plivo, Stripe, and OpenAI credentials"
echo "2. Set up PostgreSQL database and update DATABASE_URL in .env"
echo "3. Run database migrations: cd backend && npm run migrate:dev"
echo "4. (Optional) Seed database: cd backend && npm run seed"
echo "5. Start development server: cd backend && npm run dev"
echo ""
echo "For production deployment:"
echo "1. Push to GitHub"
echo "2. Connect to Render.com"
echo "3. Deploy using the render.yaml blueprint"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
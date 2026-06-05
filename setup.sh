#!/bin/bash

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  LiveKit Classroom - Complete Setup Script${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# ============= Step 1: Check .NET =============
echo -e "${YELLOW}Step 1: Checking .NET SDK...${NC}"
if command -v dotnet &> /dev/null; then
    DOTNET_VERSION=$(dotnet --version)
    echo -e "${GREEN}✓ .NET installed: $DOTNET_VERSION${NC}"
else
    echo -e "${RED}✗ .NET SDK not found. Installing...${NC}"
    brew install dotnet
    if command -v dotnet &> /dev/null; then
        echo -e "${GREEN}✓ .NET installed successfully${NC}"
    else
        echo -e "${RED}✗ Failed to install .NET. Please install manually:${NC}"
        echo -e "  ${BLUE}brew install dotnet${NC}"
        exit 1
    fi
fi
echo ""

# ============= Step 2: Check PostgreSQL =============
echo -e "${YELLOW}Step 2: Checking PostgreSQL...${NC}"
if brew services list | grep -q "postgresql.*started"; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL not running. Starting...${NC}"
    brew services start postgresql@16
    sleep 2
    if brew services list | grep -q "postgresql.*started"; then
        echo -e "${GREEN}✓ PostgreSQL started${NC}"
    else
        echo -e "${RED}✗ Failed to start PostgreSQL${NC}"
        exit 1
    fi
fi
echo ""

# ============= Step 3: Create Database =============
echo -e "${YELLOW}Step 3: Setting up database...${NC}"
DB_NAME="teaching_platform"
DB_USER="harshavardhanan"

if psql -U $DB_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>/dev/null | grep -q 1; then
    echo -e "${GREEN}✓ Database '$DB_NAME' exists${NC}"
else
    echo -e "${YELLOW}⚠ Creating database '$DB_NAME'...${NC}"
    psql -U $DB_USER -c "CREATE DATABASE $DB_NAME" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database created${NC}"
    else
        echo -e "${YELLOW}⚠ Database may already exist${NC}"
    fi
fi
echo ""

# ============= Step 4: Setup Backend =============
echo -e "${YELLOW}Step 4: Setting up backend...${NC}"
cd backend/TeachingPlatform.API

echo -e "${BLUE}  Restoring NuGet packages...${NC}"
dotnet restore > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ NuGet packages restored${NC}"
else
    echo -e "${RED}  ✗ Failed to restore packages${NC}"
    exit 1
fi

echo -e "${BLUE}  Applying database migrations...${NC}"
dotnet ef database update > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ Database migrations applied${NC}"
else
    echo -e "${YELLOW}  ⚠ Migrations may have issues (check appsettings)${NC}"
fi

cd ../..
echo ""

# ============= Step 5: Install Frontend Dependencies =============
echo -e "${YELLOW}Step 5: Setting up frontend...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Node modules already installed${NC}"
else
    echo -e "${BLUE}  Installing npm packages...${NC}"
    npm install > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ npm packages installed${NC}"
    else
        echo -e "${RED}✗ Failed to install npm packages${NC}"
        exit 1
    fi
fi
echo ""

# ============= Summary =============
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✓ Setup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "1. ${YELLOW}Start the backend:${NC}"
echo -e "   ${BLUE}cd backend/TeachingPlatform.API && dotnet run${NC}"
echo ""
echo -e "2. ${YELLOW}In another terminal, start the frontend:${NC}"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""
echo -e "3. ${YELLOW}Open browser and go to:${NC}"
echo -e "   ${BLUE}http://localhost:3000${NC}"
echo ""
echo -e "${GREEN}Enjoy! 🚀${NC}"

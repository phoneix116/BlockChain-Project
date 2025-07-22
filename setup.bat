@echo off
echo Setting up Invoice Chain Project...
echo.

echo Installing root dependencies...
call npm install
if errorlevel 1 (
    echo Failed to install root dependencies
    pause
    exit /b 1
)

echo.
echo Installing client dependencies...
cd client
call npm install
if errorlevel 1 (
    echo Failed to install client dependencies
    pause
    exit /b 1
)

cd ..

echo.
echo Installing server dependencies...
cd server
call npm install
if errorlevel 1 (
    echo Failed to install server dependencies
    pause
    exit /b 1
)

cd ..

echo.
echo Setup completed successfully!
echo.
echo Next steps:
echo 1. Copy .env.example to .env and configure your environment
echo 2. Start Hardhat node: npm run node
echo 3. Deploy contracts: npm run deploy:local
echo 4. Start backend: npm run dev:server
echo 5. Start frontend: npm run dev:client
echo.
pause

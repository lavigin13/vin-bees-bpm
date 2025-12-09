# VinBees RPG Profile - Walkthrough

This is a gamified employee profile app styled like an RPG character sheet.

## Features
- **Hero Profile**: Displays avatar, level badge, XP bar, and role.
- **Honey Balance**: Animated counter for the company currency ("Honey").
- **Inventory System**: 
    - **Gear**: Assigned assets (Laptop, Car).
    - **Materials**: Resources for crafting (Battery, Scrap Metal).
    - **Tabs**: Switch between Gear and Materials.
- **Crafting System**:
    - **Station**: Accessible from Materials tab.
    - **Recipes**: Select blueprints (e.g., Power Pack).
    - **Logic**: Checks for required materials and deducts them upon crafting.
    - **Additional Cost**: Input for extra expenses.
- **Character Sheet**: Editable form for personal details (Gender, Age, Minions/Children, Hobby).
- **Telegram Integration**: Adapts to Telegram's theme colors and expands to full height.

## Project Structure
- `src/components/HeroProfile.jsx`: Avatar and stats visualization.
- `src/components/Inventory.jsx`: Asset grid with rarity styling.
- `src/components/EditProfile.jsx`: Form for updating user data.
- `src/index.css`: Global RPG theme (Dark mode, Gold accents).

## How to Run
1. **Local Development**:
   ```bash
   cd VinBeesProfile
   npm run dev
   ```
2. **Build for Production**:
   ```bash
   npm run build
   ```
   The `dist` folder is ready for deployment.

### 3. API Integration
- **Endpoints**:
  - `GET /profile`: Fetches user data.
  - `GET /inventory`: Fetches inventory items.
  - `PUT /profile`: Updates user profile data.
- **Authorization**: Uses Telegram Web App `initData` in the `Authorization` header (`tma <initData>`).
- **Data Handling**:
  - **Birthday**: Stored as `YYYY-MM-DD` internally, displayed as `dd.MM.yyyy` in UI, and sent as `dd.MM.yyyy` to API.
  - **Children**: Strictly handled as an integer.
  - **Mock Data**: Disabled when running inside Telegram; used as fallback for local development.

### 4. Profile Features
- **Edit Profile**: Users can update their Gender, Birthday, Children count, and Hobby.
- **Date Picker**: Custom styled input that enforces `dd.MM.yyyy` display format while using native date picker.
- **Validation**: Ensures correct data types before sending to API.

## Mock Data
Mock data is defined in `src/App.jsx` and serves as a fallback when the API is unavailable or returns empty responses.

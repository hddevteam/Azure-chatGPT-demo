# Azure ChatGPT Demo - AI Coding Instructions

## Project Overview
A comprehensive Azure OpenAI chat application with advanced AI capabilities including Sora video generation, real-time voice chat, and multi-modal interactions. Built with Node.js backend and modular vanilla JavaScript frontend.

## Core Architecture Patterns

### Backend: Controller-Service Pattern
- **Controllers** (`/controllers/`): Handle HTTP requests, validation, and response formatting
- **Services** (`/services/`): Business logic and external API integrations
- **API Routes** (`apiRoutes.js`): Centralized route definitions with Azure AD auth middleware
- **Event-Driven Communication**: `eventbus.js` + `websocket.js` for real-time features

Example controller pattern:
```javascript
// controllers/soraController.js
class SoraController {
    constructor() {
        this.soraService = new SoraApiService();
        this.activeJobs = new Map(); // In-memory job tracking
    }
    async generateVideo(req, res) {
        const validation = this.soraService.validateParameters(params);
        if (!validation.isValid) {
            return res.status(400).json({ success: false, error: "Validation failed" });
        }
        const result = await this.soraService.generateVideo(params);
        // Job management and response handling
    }
}
```

### Frontend: Component-Based Architecture
- **UIManager** (`public/components/UIManager.js`): Central coordinator for all UI components
- **Managers**: Specialized components for different concerns (MessageManager, StorageManager, SyncManager)
- **Event-Driven**: EventManager handles all DOM interactions and component communication
- **Modular Design**: Components in `/public/components/` and `/public/modules/`

Key component initialization pattern:
```javascript
// public/components/UIManager.js
initializeManagers() {
    this.messageManager = new MessageManager(this);
    this.storageManager = new StorageManager(this);
    this.syncManager = new SyncManager(this);
    // Manager dependencies are injected via constructor
}
```

### New Model Integration & Feature Detection

#### GPT-5 Series Models
- **gpt-5, gpt-5-mini, gpt-5-nano**: Full feature support including:
  - ✅ Function calling & parallel tool calling
  - ✅ System messages & developer messages
  - ✅ Vision capabilities (text + image input)
  - ✅ Structured outputs & reasoning effort control
  - ✅ **NEW**: Verbosity control (`low`, `medium`, `high`)
  - ✅ **NEW**: Preamble support for function call planning
  - ✅ **NEW**: Minimal reasoning effort setting
  - ✅ **NEW**: Custom tool types for raw text outputs
  - ✅ **NEW**: Lark tool for Python lark grammar constraints
  - 📊 Context: 272K input, 128K output tokens

- **gpt-5-chat**: Limited preview model
  - ❌ No function calling or vision (text-only)
  - ✅ System messages & structured outputs
  - 📊 Context: 128K input, 16K output tokens

#### O3-PRO Advanced Reasoning
- ✅ Full function calling & parallel tool calling support
- ✅ Advanced reasoning with summary capabilities (limited access)
- ⚠️ Requires background mode to avoid timeouts
- ❌ No image generation capability
- 📊 Context: 200K input, 100K output tokens

#### Feature Detection Pattern
Use `supportsFeature(model, feature)` for capability checks:
```javascript
// Check model capabilities before API calls
if (supportsFeature(model, 'supportsFunctionCalling')) {
    // Add function tools to request
}
if (supportsFeature(model, 'supportsVerbosity')) {
    // Use GPT-5 verbosity control
}
if (supportsFeature(model, 'requiresBackgroundMode')) {
    // Use background mode for O3-PRO
}
```

## Essential Development Workflows

### Environment Setup
1. **Required .env variables**: GPT_4O_API_URL, SORA_API_URL, AZURE_STORAGE_CONNECTION_STRING
2. **New model support**: GPT-5 series (gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-chat) and O3-PRO with advanced reasoning capabilities
3. **Development**: `npm run dev` (runs server + webpack watch)
4. **Production build**: `npm run build` then `npm start`
5. **Azure AD config**: Must manually update `utils/authConfig.js` (known CI/CD limitation)

### Message Flow Architecture
Messages follow a specific lifecycle:
1. **Input**: MessageManager.sendMessage() → MessageProcessor (factory pattern)
2. **Storage**: StorageManager (local) → SyncManager (Azure Table Storage)
3. **UI**: MessageUIHandler → DOMManager → EventManager (event listeners)
4. **State**: Active/inactive messages via conversation context system

### Real-time Communication
- **WebSocket** (`websocket.js`): Maintains userId-based client connections
- **EventBus** (`eventbus.js`): Server-side event coordination
- **Client events**: All handled through EventManager's delegation pattern

## Critical Integration Points

### Azure Storage Pattern
All data persistence follows this dual-storage pattern:
```javascript
// Local storage first, then sync to cloud
this.storageManager.saveMessage(chatId, message);
this.syncManager.syncMessageCreate(chatId, message);
```

### Sora Video Generation Workflow
1. **Job Creation**: SoraController.generateVideo() → SoraApiService
2. **Progress Tracking**: Polling-based with activeJobs Map
3. **File Management**: Auto-save to `public/generated-videos/`
4. **UI Integration**: SoraVideoModal handles user interactions

### Authentication Flow
- **Azure AD B2C**: Configured in `authConfig.js` (hardcoded, not env vars)
- **Token Management**: Automatic refresh in SyncManager.updateToken()
- **Route Protection**: All `/api/*` routes use `passport.authenticate("oauth-bearer")`

## Project-Specific Conventions

### Error Handling Pattern
Controllers return structured responses:
```javascript
{ success: boolean, data?: any, error?: string, details?: any }
```

### File Organization
- **Controllers**: Business logic only, delegate to services
- **Services**: External API calls and complex business rules
- **Public/Components**: UI components with single responsibilities
- **Public/Modules**: Feature-specific functionality (message processing, chat management)

### Event Management
All DOM events use delegation pattern in EventManager:
```javascript
// Event delegation for dynamic content
document.addEventListener("click", (e) => {
    const editButton = e.target.closest(".message-image-edit-btn");
    if (!editButton) return;
    // Handle edit functionality
});
```

### CSS Architecture & Styling Conventions
- **Modular CSS**: Organized in `/public/css/` with component-based structure
- **BEM Methodology**: Block__element--modifier naming pattern for complex components
- **CSS Variables**: Centralized theme variables in `:root` (colors, typography, spacing)
- **Responsive Design**: Mobile-first approach with breakpoints at 768px and 480px
- **Component Structure**: Separate files for major features (sora-studio.css, ai-actor-settings-modal.css)

CSS naming examples:
```css
/* BEM pattern for complex components */
.sora-form__btn--primary { /* Block__element--modifier */ }
.sora-task__status--pending { }
.gpt-image-modal__tab--active { }

/* CSS Variables for consistency */
:root {
    --primary-color: #0366d6;
    --font-size-md: 1em;
    --border-radius: 8px;
}
```

### Message State Management
- **Active/Inactive**: Messages can be toggled to control conversation context
- **Conversation Context**: MessageContextManager rebuilds prompts from active messages
- **Persistence**: Both local storage and Azure Table Storage for cross-device sync

## Key Commands & Debugging

### Development
- `npm run dev` - Start with hot reload (server + webpack watch)
- `npm start` - Production server
- `npm test` - Run Mocha + Jest test suites

### Azure Integration
- Profile migration: `node scripts/runMigration.js <email>` 
- File uploads: Handled via multer → Azure Blob Storage
- Table operations: Use `services/azureTableStorage.js` helper functions

### Build Configuration
- **Webpack**: Development vs CI/CD environment detection for auth config
- **PWA**: Service worker in `public/service-worker.js`
- **Static assets**: All in `public/` directory, served by Express static middleware

## Development Guidelines

### Code Style and Structure
1. **Use English** for all code comments, variable names, and documentation
2. **Follow BEM naming convention** for CSS classes
3. **Split large files** (>500 lines) into smaller, focused modules
4. **Use ES6+ features**: arrow functions, destructuring, async/await
5. **Maintain consistent indentation**: 2 spaces for JavaScript, 4 spaces for HTML

### File Organization
```
/controllers/          # Business logic controllers
  /gpt/               # GPT-specific controllers
/services/            # External service integrations
/public/              # Static frontend assets
  /components/        # Reusable UI components
  /modules/           # Feature-specific modules
  /utils/             # Helper utilities
/docs/                # GitHub Pages documentation
/tests/               # Unit and integration tests
```

### Architecture Patterns
- **MVC Pattern**: Controllers handle business logic, views handle presentation
- **Module Pattern**: Each feature is self-contained with clear interfaces
- **Service Layer**: External API calls are abstracted into service classes
- **Event-Driven**: Use EventBus for component communication

### Security Best Practices
- **Environment Variables**: Store all secrets in .env files
- **Azure AD Integration**: Use Microsoft authentication for enterprise features
- **Input Validation**: Sanitize all user inputs
- **CORS Configuration**: Properly configure cross-origin requests
- **Rate Limiting**: Implement API rate limiting for production

### API Integration Guidelines
1. **Error Handling**: Always implement comprehensive error handling for API calls
2. **Retry Logic**: Add exponential backoff for transient failures
3. **Caching**: Cache API responses where appropriate
4. **Monitoring**: Log API usage and performance metrics

### Frontend Development
- **Responsive Design**: Mobile-first approach with breakpoints at 768px and 480px
- **Progressive Enhancement**: Ensure basic functionality works without JavaScript
- **Accessibility**: Follow WCAG 2.1 guidelines
- **Performance**: Optimize images, minimize bundle size
- **CSS Architecture**: Modular CSS with BEM methodology for components
- **Theming**: CSS custom properties (variables) for consistent styling

### Testing Strategy
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test Azure service integrations
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Monitor API response times and memory usage

### Deployment and CI/CD
- **GitHub Actions**: Automated testing and deployment
- **Azure Web Apps**: Production hosting
- **GitHub Pages**: Documentation and demo site
- **Environment Management**: Separate dev, staging, and production configs

## Feature-Specific Instructions

### Sora Video Generation
- Use the SoraApiService for all video generation requests
- Implement progress tracking for long-running video generation
- Handle video file storage and retrieval through Azure Blob Storage
- Provide user feedback during generation process

### Real-time Voice Chat
- Utilize GPT Realtime models (gpt-realtime & gpt-realtime-mini) for voice interactions
- Implement WebRTC for real-time audio streaming
- Handle audio buffering and quality optimization
- Provide visual feedback for recording and processing states

### Chat History Management
- Store conversations in Azure Table Storage
- Implement soft delete for message management
- Support conversation export to markdown
- Maintain user privacy and data retention policies

### Authentication Flow
- Integrate Azure AD B2C for user management
- Support both individual and enterprise accounts
- Implement proper session management
- Handle token refresh and expiration

### PWA Implementation
- Service Worker for offline functionality
- App manifest for installation
- Push notifications for important updates
- Background sync for pending operations

## Common Patterns and Utilities

### Error Handling Pattern
```javascript
try {
  const result = await apiService.call();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, error: error.message };
}
```

### API Service Pattern
```javascript
class ApiService {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  
  async makeRequest(endpoint, options = {}) {
    // Implementation with retry logic and error handling
  }
}
```

### Component Initialization Pattern
```javascript
class ComponentManager {
  constructor() {
    this.components = new Map();
  }
  
  register(name, component) {
    this.components.set(name, component);
  }
  
  init() {
    this.components.forEach(component => component.init());
  }
}
```

## Performance Considerations
- **Lazy Loading**: Load components and modules on demand
- **Image Optimization**: Use appropriate formats and sizes
- **Bundle Splitting**: Separate vendor and application code
- **Caching Strategy**: Implement proper cache headers and service worker caching
- **Memory Management**: Clean up event listeners and timers

## Accessibility Requirements
- **Keyboard Navigation**: All interactive elements must be keyboard accessible
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Color Contrast**: Maintain WCAG AA contrast ratios
- **Focus Management**: Visible focus indicators for all interactive elements

## Browser Compatibility
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Polyfills**: Include necessary polyfills for ES6+ features

## Monitoring and Analytics
- **Application Insights**: Track user interactions and performance
- **Error Logging**: Comprehensive error tracking and alerting
- **Performance Metrics**: Monitor API response times and user experience
- **Usage Analytics**: Track feature adoption and user engagement

## Documentation Standards
- **README.md**: Keep updated with latest setup instructions
- **API Documentation**: Document all endpoints and data models
- **Component Documentation**: Include usage examples and props
- **Deployment Guide**: Maintain current deployment procedures

Remember to always prioritize user experience, security, and maintainability when developing new features or modifying existing code.

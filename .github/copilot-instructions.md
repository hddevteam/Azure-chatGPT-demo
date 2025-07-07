# Copilot Development Instructions

## Project Overview
Azure-chatGPT-demo is a comprehensive AI chat application built with Node.js, featuring Azure OpenAI integration, Sora video generation, and real-time voice capabilities. This project serves as a modern, full-featured chatGPT implementation with PWA support.

## Technology Stack

### Backend Technologies
- **Runtime**: Node.js 16+
- **Framework**: Express.js 4.x
- **Build Tool**: Webpack 5.x
- **Package Manager**: npm

### Frontend Technologies
- **Languages**: JavaScript (ES6+), HTML5, CSS3
- **Architecture**: Vanilla JavaScript with modular components
- **Styling**: BEM CSS methodology with responsive design
- **PWA**: Service Worker, Web App Manifest

### Azure Services Integration
- **Azure OpenAI Service**: GPT-4o, GPT-4o-mini, o1, o1-mini, o3, o3-mini models
- **Azure Speech Services**: Text-to-Speech, Speech-to-Text, Whisper transcription
- **Azure Active Directory**: Enterprise authentication
- **Azure Blob Storage**: File storage and media handling
- **Azure Table Storage**: User profiles and chat history
- **Azure Application Insights**: Monitoring and analytics

### AI Model Support
- **Text Models**: GPT-4o-realtime, GPT-4o, GPT-4o-mini, o1-preview, o1-mini, o3, o3-mini
- **Image Models**: DALL-E 3, GPT-Image-1
- **Video Models**: Sora (OpenAI)
- **Speech Models**: Azure Speech, Whisper

### External APIs
- **Sora API**: Video generation from text descriptions
- **Bing Search API**: News integration and web search
- **Microsoft Graph API**: User profile management

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
- Utilize GPT-4o-realtime-preview model for voice interactions
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

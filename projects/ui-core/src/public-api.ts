// Config
export { PIVOT_API_URL } from './lib/config/tokens';
export { provideUiCore } from './lib/config/provide-ui-core';
export type { UiCoreConfig } from './lib/config/provide-ui-core';

// Auth
export type { UserInfo, AuthResponse, LoginRequest, RegisterRequest } from './lib/auth/auth.model';
export { AuthService } from './lib/auth/auth.service';
export { tokenInterceptor } from './lib/auth/token.interceptor';
export { authGuard, authMatchGuard, guestGuard } from './lib/auth/auth.guard';

// Modules
export type { ModuleStatus, PivotModuleDto, ModuleStatusDto } from './lib/modules/module.model';
export { ModuleStatusService } from './lib/modules/module-status.service';
export { moduleGuard } from './lib/modules/module.guard';

// Layout
export { HeaderComponent } from './lib/layout/header.component';
export { FooterComponent } from './lib/layout/footer.component';

// Add user property to Express Request interface
declare namespace Express {
  export interface Request {
    user?: any;
  }
}

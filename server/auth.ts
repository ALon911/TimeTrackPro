import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import argon2 from "argon2";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Check if a hash is scrypt format (contains a dot)
function isScryptHash(hash: string) {
  return hash.includes('.') && hash.split('.').length === 2;
}

// Check if a hash is Argon2id format (starts with $argon2id$)
function isArgon2idHash(hash: string) {
  return hash.startsWith('$argon2id$');
}

export async function hashPassword(password: string) {
  // Always use Argon2id for new passwords
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
    hashLength: 32
  });
}

async function comparePasswords(supplied: string, stored: string) {
  // Check if the stored hash is Argon2id format
  if (isArgon2idHash(stored)) {
    try {
      return await argon2.verify(stored, supplied);
    } catch (error) {
      return false;
    }
  }
  
  // Check if the stored hash is scrypt format (legacy)
  if (isScryptHash(stored)) {
    try {
      const [hashed, salt] = stored.split('.');
      const hashedBuf = Buffer.from(hashed, 'hex');
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      const isValid = timingSafeEqual(hashedBuf, suppliedBuf);
      
      return isValid;
    } catch (error) {
      return false;
    }
  }
  
  // Unknown hash format
  console.warn('⚠️ Unknown password hash format');
  return false;
}

async function upgradePasswordToArgon2id(userId: number, password: string) {
  try {
    const newHash = await hashPassword(password);
    const success = await storage.updateUserPassword(userId, newHash);
    if (success) {
      console.log(`✅ User ${userId} password upgraded to Argon2id`);
    }
    return success;
  } catch (error) {
    console.error('Error upgrading password:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "timetracker-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
    },
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false);
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false);
        }

        // If user has scrypt hash, upgrade to Argon2id
        if (isScryptHash(user.password)) {
          console.log('🔄 Upgrading user password from scrypt to Argon2id...');
          await upgradePasswordToArgon2id(user.id, password);
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Authentication middleware functionality implemented below

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "כתובת דוא״ל זו כבר בשימוש" });
      }

      // Generate username from email (e.g., part before @)
      const username = req.body.email.split('@')[0];
      
      const user = await storage.createUser({
        username,
        email: req.body.email,
        password: await hashPassword(req.body.password),
        displayName: req.body.displayName || null,
      });

      // Don't send the password hash back to the client
      const { password, ...userWithoutPassword } = user;

      req.login(user, (err: any) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "כתובת דוא״ל או סיסמה שגויים" });
      }
      
      req.login(user, (err: any) => {
        if (err) return next(err);
        
        // Don't send the password hash back to the client
        const { password, ...userWithoutPassword } = user;
        
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Don't send the password hash back to the client
    const { password, ...userWithoutPassword } = req.user;
    
    res.json(userWithoutPassword);
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "לא מורשה" });
}

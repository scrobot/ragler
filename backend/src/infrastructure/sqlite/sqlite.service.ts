import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

@Injectable()
export class SqliteService implements OnModuleDestroy {
    private readonly logger = new Logger(SqliteService.name);
    private readonly db: Database.Database;

    constructor(private readonly configService: ConfigService) {
        const dbPath = this.configService.get<string>('sqlite.path', 'data/ragler.db');

        // Ensure parent directory exists
        mkdirSync(dirname(dbPath), { recursive: true });

        this.db = new Database(dbPath);

        // Enable WAL mode for better concurrent read performance
        this.db.pragma('journal_mode = WAL');

        this.logger.log(`SQLite database opened at ${dbPath}`);
    }

    onModuleDestroy(): void {
        this.db.close();
        this.logger.log('SQLite database connection closed');
    }

    /**
     * Execute a statement that modifies data (INSERT, UPDATE, DELETE).
     */
    run(sql: string, ...params: unknown[]): Database.RunResult {
        return this.db.prepare(sql).run(...params);
    }

    /**
     * Get a single row.
     */
    get<T>(sql: string, ...params: unknown[]): T | undefined {
        return this.db.prepare(sql).get(...params) as T | undefined;
    }

    /**
     * Get all matching rows.
     */
    all<T>(sql: string, ...params: unknown[]): T[] {
        return this.db.prepare(sql).all(...params) as T[];
    }

    /**
     * Execute raw SQL (for DDL statements like CREATE TABLE).
     */
    exec(sql: string): void {
        this.db.exec(sql);
    }
}

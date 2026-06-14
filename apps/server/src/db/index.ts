/* eslint-disable @typescript-eslint/no-explicit-any */

let _db: any = null;

export function setDB(database: any) {
    _db = database;
}

function getDB(): any {
    if (!_db) {
        throw new Error("Database not initialized. Call setDB() before importing modules that use db.");
    }
    return _db;
}

export const db = new Proxy({} as any, {
    get(_, prop) {
        return getDB()[prop as string];
    },
});

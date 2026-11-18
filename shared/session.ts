// These values are safe browser metadata, never provider credentials.
export type BrowserSession={user:{id:string};csrfToken:string}
export type SessionState={configured:boolean;session:BrowserSession|null}
export type AuthFactor={id:string;status:'verified'|'unverified'}

/**
 * Memphis Telegram Bot
 *
 * Responds to messages with Memphis AI responses
 */
export declare class MemphisBot {
    private token;
    private apiUrl;
    private offset;
    constructor(token: string);
    start(): Promise<void>;
    private loop;
    private poll;
    private handleMessage;
    private sendMessage;
}

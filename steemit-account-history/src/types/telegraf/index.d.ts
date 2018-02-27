export = Telegraf

declare class Context {
    reply(message: String): any;
}

declare type StartupCallback = (ctx: any) => void;

declare type Middleware = () => void;

declare class Telegraf {}
/*() {
    constructor(token: string, options: object[]);

    start(startup: StartupCallback): any;

    use(middleware: Middleware): any;
}*/

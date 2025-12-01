import winston from 'winston';

// 解构 winston 中的 format 对象，方便使用
const { combine, timestamp, printf, colorize, splat } = winston.format;

// 定义日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 定义不同级别的颜色
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 告诉 winston 我们要使用自定义的颜色
winston.addColors(colors);

// 自定义日志输出格式
const logFormat = combine(
  // 为日志添加时间戳
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  // 为日志级别添加颜色
  colorize({ all: true }),
  // 对齐日志信息
  // align(),
  splat(),
  // 定义最终输出的格式
  printf((info) => `[${info.timestamp}][${info.level}]${info.message}`)
);

// 定义用于开发环境和生产环境的传输器
const transports = [
  // 1. 在控制台打印日志
  new winston.transports.Console(),

  // 2. 将所有 'error' 级别的日志写入 error.log 文件
  // new winston.transports.File({
  //   filename: 'logs/error.log',
  //   level: 'error', // 只记录 error 级别的日志
  // }),

  // 3. 将所有日志写入 all.log 文件
  // new winston.transports.File({ filename: 'logs/all.log' }),
];

// 创建 logger 实例
const logger = winston.createLogger({
  // 根据环境变量设置日志级别。如果是生产环境，级别设为 'warn'，否则设为 'debug'
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  levels, // 使用我们定义的日志级别
  format: logFormat, // 使用我们定义的日志格式
  transports, // 使用我们定义的传输器
});

export default logger;

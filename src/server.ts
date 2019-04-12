import * as Koa from 'koa';
import * as Router from 'koa-router';
import { Sequelize } from 'sequelize';
import { readFileSync, unlink, promises } from 'fs';
import form from './form';
import Books from './Books';
import config from './config';

const koastatic = require('koa-static');
const multer = require('koa-multer');
const upload = multer({ dest: 'tmp/' });

const app = new Koa();
const router = new Router();
const sequelize = new Sequelize(config.database);
const cache:Map<string, string> = new Map();
let cacheCount:number = null;

Books.INIT(sequelize);
(async() => {
	try {
		await sequelize.authenticate();
		await Books.SYNC();
	} catch (err) {
		console.error('Unable to connect to the database:', err);
	}
})();

let header:string = readFileSync('src/tpl/header.htm', 'utf8');
let footer:string = readFileSync('src/tpl/footer.htm', 'utf8');
let tableheader:string = readFileSync('src/tpl/tableheader.htm', 'utf8');

function resetCache() {
	cache.clear();
	cacheCount = null;
}

function paginator(page:number, lim:number, count:number, qs:string):string {
	const pages:number = Math.round(count / lim);
	const a:string[] = [];
	for (let i = 1; i <= pages; i++) {
		if (i - 1 == page)
			a.push(`<b>${i}</b>`);
		else
			a.push(`<a href="/${i}${qs ? '?' + qs : ''}">${i}</a>`);
	}
	return a.join(', ');
}

function getExt(file:any):string {
	switch (file.mimetype) {
		case 'image/jpeg': return '.jpg';
		case 'image/png': return '.png';
		default:
			unlink(file.path, () => {});
			throw new Error('Wrong file type');
	}
}

router.post('/', upload.single('image'), async ctx => {
	// @ts-ignore
	const file:any = ctx.req.file;
	let image:string = 'null.png';
	if (file) {
		image = file.filename + getExt(file);
		await promises.rename(file.path, `uploads/${image}`);
	}
	// @ts-ignore
	const body:any = ctx.req.body;
	const {title, author, description} = body;
	if (!title || !author || !description) {
		if (file) unlink(file.path, () => {});
		throw new Error('Empty field');
	}
	await Books.create({title, author, description, image});
	resetCache();
	ctx.redirect('/');
});

router.post('/edit', upload.single('image'), async ctx => {
	// @ts-ignore
	const file:any = ctx.req.file;
	let image:string;
	if (file) {
		image = file.filename + getExt(file);
		await promises.rename(file.path, `uploads/${image}`);
	}
	// @ts-ignore
	const body:any = ctx.req.body;
	const {id, title, author, description} = body;
	if (!id || !title || !author || !description) {
		if (file) unlink(file.path, () => {});
		throw new Error('Empty field');
	}
	if (file) {
		const r:Books = await Books.findOne({where: { id }});
		if (r.image != 'null.png') unlink(`uploads/${r.image}`, () => {});
		Books.update({title, author, description, image}, {where: { id }});
	} else {
		Books.update({title, author, description}, {where: { id }});
	}
	resetCache();
	ctx.redirect('/');
});

router.get('edit', '/edit/:id', async ctx => {
	const id:string = ctx.params.id;
	const r:Books = await Books.findOne({where: { id }});
	ctx.body = header + form(r) + footer;
});

router.get(['/', '/:page'], async ctx => {
	const limit:number = 4;
	let page:number = parseInt(ctx.params.page);
	if (!page) page = 1;
	page--;
	let order:any = [['title', 'ASC']];
	if (ctx.query.ask)
		order = [[ctx.query.ask, 'ASC']];
	else if (ctx.query.desc)
		order = [[ctx.query.desc, 'DESC']];
	const key:string = order[0].join('') + page;
	const c = cache.get(key);
	if (c) {
		ctx.body = c;
		return;
	}
	const count:number = cacheCount ? cacheCount : await Books.count();
	cacheCount = count;
	const books:Books[] = await Books.findAll({order, limit, offset: limit * page});
	var list:string = books.map(b => `<tr>
		<td>${b.title}</td>
		<td>${b.author}</td>
		<td>${b.description}</td>
		<td><img src="${b.image}"/></td>
		<td><a href="${router.url('edit', b.id)}">edit</a></td>
		</tr>`).join('');
	ctx.body = `
		${header}
		<table border="1">${tableheader}${list}</table>
		${paginator(page, limit, count, ctx.querystring)}
		<h3>New book</h3>
		${form()}
		${footer}`;
	cache.set(key, ctx.body);
});

app.use(async (ctx, next) => {
	try {
		await next();
	} catch (err) {
		ctx.status = err.status || 500;
		ctx.body = err.message;
		ctx.app.emit('error', err, ctx);
	}
});

app.use(koastatic('uploads'));
app.use(router.routes());
app.listen(config.port);
console.log('Server running on port ' + config.port);
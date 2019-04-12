import { Sequelize, Model, INTEGER, STRING, TEXT } from 'sequelize';

export default class Books extends Model {
	public id!: number;
	public title!: string;
	public author!: string;
	public description!: string;
	public image!: string;

	public static INIT(sequelize:Sequelize):void {
		Books.init({
			id: {
				type: INTEGER.UNSIGNED,
				autoIncrement: true,
				primaryKey: true,
			},
			title: {
				type: new STRING(32),
				allowNull: false,
			},
			author: {
				type: new STRING(32),
				allowNull: false,
			},
			description: {
				type: TEXT,
				allowNull: false,
			},
			image: {
				type: new STRING(64),
				allowNull: false,
			},
		}, {
			sequelize,
			tableName: 'books2',
		});
	}

	public static async SYNC() {
		await Books.sync();
		const r:Books = await Books.findOne();
		if (!r) {
			for (let i = 1; i < 6; i++)
				await Books.create({
					title: `title${i}`,
					author: `author${i}`,
					description: `description${i}`,
					image: 'null.png'
				});
		}
	}
}
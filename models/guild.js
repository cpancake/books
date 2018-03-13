class GuildModel
{
	constructor(db, id, name)
	{
		this.id = id;
		this.name = name;
		// the permissions are:
		// 0 - no permissions
		// 1 - regular permissions
		// 2 - special permissions
		this.permissions = 0;
	}

	save(db, callback)
	{
		db.put("guild:" + this.id, JSON.stringify(this), callback);
	}

	static load(db, id, callback)
	{
		db.get("guild:" + id, (err, value) => {
			if(err)
			{
				if(err.notFound) return callback(null, null);
				return callback(err);
			}

			var obj = JSON.parse(value);
			var model = new GuildModel(db, obj.id, obj.name);
			model.permissions = obj.permissions;

			callback(null, model);
		});
	}
}

module.exports = GuildModel;
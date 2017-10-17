import Schema from "./schema";

class UserFacade {
  constructor() {
    this.Schema = Schema;
  }

  create(input) {
    const schema = new this.Schema(input);
    return schema.save();
  }

  findOneAndUpdate(conditions, update) {
    return this.Schema
      .findOneAndUpdate(conditions, update, { upsert: true })
      .exec();
  }

  findOne(...query) {
    return this.Schema.findOne(...query).exec();
  }

  async findOrCreate({ chatId }) {
    const user = await this.findOne({ chatId });
    if (!user) {
      return this.create({ chatId });
    }
    return Promise.resolve(user);
  }
}

export default new UserFacade();

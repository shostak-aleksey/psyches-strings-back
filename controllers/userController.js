const ApiError = require("../error/ApiError");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Basket } = require("../modules/modules");

const generateJwt = (id, email, role) => {
  return jwt.sign({ id, email, role }, process.env.SECRET_KEY, {
    expiresIn: "1h",
  });
};

class UserController {
  async registration(req, res, next) {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return next(ApiError.badRequest("Некорректный email или password"));
    }
    const candidate = await User.findOne({ where: { email } });
    if (candidate) {
      return next(
        ApiError.badRequest("пользователь с таким email уже существует")
      );
    }
    const hashPassword = await bcrypt.hash(password, 5);
    const user = await User.create({ email, role, password: hashPassword });
    const basket = await Basket.create({ userId: user.id });
    const token = generateJwt(user.id, user.email, user.role);
    return res.json({ token });
  }

  async login(req, res, next) {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return next(ApiError.internal("Пользователь не найден"));
    }
    let comparePassword = bcrypt.compareSync(password, user.password);
    if (!comparePassword) {
      return next(ApiError.internal("Указанный пароль неверен"));
    }
    const token = generateJwt(user.id, user.email, user.role);
    return res.json({ token });
  }

  async check(req, res) {
    const token = generateJwt(req.user.id, req.user.email, req.user.role);
    return res.json({ token });
  }

  async getAll(req, res, next) {
    try {
      const users = await User.findAll();
      return res.json(users);
    } catch (e) {
      return next(
        ApiError.internal("Ошибка при получении списка пользователей")
      );
    }
  }

  async getOne(req, res, next) {
    const { id } = req.params;
    try {
      const user = await User.findOne({ where: { id } });
      if (!user) {
        return next(ApiError.notFound("Пользователь не найден"));
      }
      return res.json(user);
    } catch (e) {
      return next(ApiError.internal("Ошибка при получении пользователя"));
    }
  }

  async update(req, res, next) {
    const { id } = req.params;
    const { email, role } = req.body;
    try {
      const user = await User.findOne({ where: { id } });
      if (!user) {
        return next(ApiError.notFound("Пользователь не найден"));
      }
      user.email = email || user.email;
      user.role = role || user.role;
      await user.save();
      return res.json(user);
    } catch (e) {
      return next(ApiError.internal("Ошибка при обновлении пользователя"));
    }
  }

  async delete(req, res, next) {
    const { id } = req.params;
    try {
      const user = await User.findOne({ where: { id } });
      if (!user) {
        return next(ApiError.notFound("Пользователь не найден"));
      }
      await user.destroy();
      return res.json({ message: "Пользователь удален" });
    } catch (e) {
      return next(ApiError.internal("Ошибка при удалении пользователя"));
    }
  }
}

module.exports = new UserController();

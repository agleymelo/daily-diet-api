import { randomUUID } from 'node:crypto'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { knex } from '../database'
import { checkSessionIdExists } from '../middlewares/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", checkSessionIdExists)

  app.get("/metrics", async (request, reply) => {
    const { id: userId } = request.user

    const totalMealsOnDiet = await knex("meals").where({ user_id: userId, is_diet: true }).count("id", { as: "total" }).first()
    const totalMealsOffDiet = await knex("meals").where({ user_id: userId, is_diet: false }).count("id", { as: "total" }).first()
    const totalMeals = await knex("meals").where({ user_id: userId }).orderBy("date", "desc")

    const { bestOnDiet } = totalMeals.reduce((acc, meals) => {
      if (meals.is_diet) {
        acc.currenteSequenceOnDiet += 1
      } else {
        acc.currenteSequenceOnDiet = 0
      }

      if (acc.currenteSequenceOnDiet > acc.bestOnDiet) {
        acc.bestOnDiet = acc.currenteSequenceOnDiet
      }

      return acc

    }, {
      bestOnDiet: 0,
      currenteSequenceOnDiet: 0,
    })

    return reply.status(200).send({
      totalMeals: totalMeals.length,
      totalMealsOnDiet: totalMealsOnDiet?.total,
      totalMealsOffDiet: totalMealsOffDiet?.total,
      bestOnDiet
    })
  })

  app.get('/', async (request, reply) => {
    const { id: userId } = request.user

    const meals = await knex('meals').where({ user_id: userId }).orderBy('date', 'asc')

    return reply.status(200).send({ meals })
  })

  app.get('/:mealId', async (request, reply) => {
    const getMealParamsSchema = z.object({
      mealId: z.string(),
    })

    const { mealId } = getMealParamsSchema.parse(request.params)
    const { id: userId } = request.user

    const meal = await knex('meals').where({ id: mealId, user_id: userId }).first()

    if (!meal) {
      return reply.status(404).send({
        error: 'Meal not found',
      })
    }

    return reply.status(200).send({ meal })
  })

  app.post('/', async (request, reply) => {
    const createMealsBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      isDiet: z.boolean(),
    })

    const { name, description, date, isDiet } = createMealsBodySchema.parse(request.body)
    const { id: userId } = request.user

    await knex('meals').insert({
      id: randomUUID(),
      user_id: userId,
      name,
      description,
      date: date.getTime(),
      is_diet: isDiet,
    })

    return reply.status(201).send()
  })

  app.put("/:mealId", async (request, reply) => {
    const getMealsParamsSchema = z.object({
      mealId: z.string()
    })

    const updateMealsBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      isDiet: z.boolean()
    })

    const { mealId } = getMealsParamsSchema.parse(request.params)
    const { name, description, date, isDiet } = updateMealsBodySchema.parse(request.body)
    const { id: userId } = request.user

    const meal = await knex("meals").where({ id: mealId, user_id: userId }).first()

    if (!meal) {
      return reply.status(404).send({
        error: "Meal not found"
      })
    }

    meal.name = name ?? meal.name
    meal.description = description ?? meal.description
    meal.date = Number(date) ?? meal.date
    meal.is_diet = isDiet ?? meal.is_diet

    await knex("meals").where({ id: mealId, user_id: userId }).update(meal)

    return reply.status(204).send()
  })

  app.delete("/:mealId", async (request, reply) => {
    const getMealParamsSchema = z.object({
      mealId: z.string()
    })
    const { mealId } = getMealParamsSchema.parse(request.params)

    const { id: userId } = request.user

    const meal = await knex("meals").where({ id: mealId, user_id: userId }).first()

    if (!meal) {
      return reply.status(404).send({
        error: "Meal not found"
      })
    }

    await knex("meals").where({ id: id.mealId }).delete()

    return reply.status(204).send()
  })
}

import { Inject, Injectable } from "@nestjs/common";
import { PrismaClient } from "@fireslot/db";
import { PRISMA } from "../../prisma/prisma.module";

@Injectable()
export class CategoriesService {
  constructor(@Inject(PRISMA) private prisma: PrismaClient) {}

  async getActiveCategories() {
    const top = await this.prisma.gameCategory.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
    });

    const activeIds = top.filter((t) => t.isActive).map((t) => t.id);
    const allChildren = activeIds.length
      ? await this.prisma.gameCategory.findMany({
          where: { parentId: { in: activeIds }, isActive: true },
          orderBy: { sortOrder: "asc" },
        })
      : [];

    return top.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      coverUrl: t.coverUrl,
      isActive: t.isActive,
      comingSoon: t.comingSoon,
      sortOrder: t.sortOrder,
      children: t.isActive
        ? allChildren
            .filter((c) => c.parentId === t.id)
            .map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              gameMode: c.gameMode,
              description: c.description,
              sortOrder: c.sortOrder,
            }))
        : [],
    }));
  }
}

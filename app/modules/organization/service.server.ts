import { OrganizationRoles, OrganizationType } from "@prisma/client";
import type { Organization, User } from "@prisma/client";

import { db } from "~/database";
import { defaultUserCategories } from "../category/default-categories";

export const getOrganization = async ({ id }: { id: Organization["id"] }) =>
  db.organization.findUnique({
    where: { id },
  });

export const getOrganizationByUserId = async ({
  userId,
  orgType,
}: {
  userId: User["id"];
  orgType: OrganizationType;
}) =>
  await db.organization.findFirstOrThrow({
    where: {
      owner: {
        is: {
          id: userId,
        },
      },
      type: orgType,
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

export type UserOrganization = Awaited<
  ReturnType<typeof getOrganizationByUserId>
>;

export const getUserOrganizationsWithDetailedData = async ({
  userId,
}: {
  userId: User["id"];
}) =>
  await db.organization.findMany({
    where: {
      owner: {
        is: {
          id: userId,
        },
      },
    },
    include: {
      _count: {
        select: {
          assets: true,
          members: true,
        },
      },
    },
  });

export async function createOrganization({
  name,
  userId,
  image,
}: Pick<Organization, "name"> & {
  userId: User["id"];
  image: File | null;
}) {
  const data = {
    name,
    type: OrganizationType.TEAM,
    categories: {
      create: defaultUserCategories.map((c) => ({ ...c, userId })),
    },
    userOrganizations: {
      create: {
        userId,
        roles: [OrganizationRoles.OWNER],
      },
    },
    owner: {
      connect: {
        id: userId,
      },
    },
  };

  const org = await db.organization.create({ data });
  if (image?.size && image?.size > 0) {
    await db.image.create({
      data: {
        blob: Buffer.from(await image.arrayBuffer()),
        contentType: image.type,
        ownerOrg: {
          connect: {
            id: org.id,
          },
        },
        organization: {
          connect: {
            id: org.id,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }
  return org;
}

export const getUserOrganizations = async ({ userId }: { userId: string }) => {
  const userOrganizations = await db.userOrganization.findMany({
    where: { userId },
    select: {
      organization: {
        select: { id: true, type: true },
      },
    },
  });

  return userOrganizations.map((uo) => uo.organization);
};

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const signUpSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    console.error("Signup error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

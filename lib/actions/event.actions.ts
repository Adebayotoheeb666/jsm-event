'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '../database'; // Adjusted path
import Event from '../database/models/event.model'; // Adjusted path
import User from '../database/models/user.model'; // Adjusted path
import Category from '../database/models/category.model'; // Adjusted path
import { handleError } from '../utils'; // Adjusted path
import { auth } from "@clerk/nextjs";

import {
  CreateEventParams,
  UpdateEventParams,
  DeleteEventParams,
  GetAllEventsParams,
  GetEventsByUserParams,
  GetRelatedEventsByCategoryParams,
} from '@/types'; // Adjusted path

export async function syncUserWithDatabase() {
  const { userId } = auth();
  if (!userId) return;

  const user = await User.findOne({ clerkId: userId });
  if (!user) {
    // Create a new user in the database
    await User.create({ clerkId: userId, firstName: "New", lastName: "User" });
  }
}

const getCategoryByName = async (name: string) => {
  return Category.findOne({ name: { $regex: name, $options: 'i' } });
};

const populateEvent = async (query: any) => {
  const event = await query.populate({ path: 'category', model: Category, select: '_id name' });

  // Manually fetch organizer details
  const organizer = await User.findOne({ clerkId: event.organizer });
  event.organizer = organizer ? { _id: organizer._id, firstName: organizer.firstName, lastName: organizer.lastName } : null;

  return event;
};

// CREATE
export const createEvent = async ({ event, sub, path }: { event: any; sub: string; path: string }) => {
  try {
    await connectToDatabase();

    // Find the user by their ID (sub)
    const organizer = await User.findById(sub);

    // Check if the organizer exists
    if (!organizer) {
      throw new Error("Organizer not found. Please contact support.");
    }

    // Create the event
    const newEvent = await Event.create({ ...event, organizer: sub });

    // Update the user's events list
    await User.findByIdAndUpdate(sub, { $push: { events: newEvent._id } });

    return JSON.parse(JSON.stringify(newEvent));
  } catch (error) {
    handleError(error);
  }
}

// GET ONE EVENT BY ID
export async function getEventById(eventId: string) {
  try {
    await connectToDatabase();

    const event = await populateEvent(Event.findById(eventId));
    if (!event) throw new Error('Event not found');

    return JSON.parse(JSON.stringify(event));
  } catch (error) {
    handleError(error);
  }
}

// UPDATE
export async function updateEvent({ sub, event, path }: UpdateEventParams) {
  try {
    await connectToDatabase();

    const eventToUpdate = await Event.findById(event._id);
    if (!eventToUpdate || eventToUpdate.organizer !== sub) {
      throw new Error('Unauthorized or event not found');
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      event._id,
      { ...event, category: event.categoryId },
      { new: true }
    );
    revalidatePath(path);

    return JSON.parse(JSON.stringify(updatedEvent));
  } catch (error) {
    handleError(error);
  }
}

// DELETE
export async function deleteEvent({ eventId, path }: DeleteEventParams) {
  try {
    await connectToDatabase();

    const deletedEvent = await Event.findByIdAndDelete(eventId);
    if (deletedEvent) revalidatePath(path);
  } catch (error) {
    handleError(error);
  }
}

// GET ALL EVENTS
export async function getAllEvents({ query, limit = 6, page, category }: GetAllEventsParams) {
  try {
    await connectToDatabase();

    const titleCondition = query ? { title: { $regex: query, $options: 'i' } } : {};
    const categoryCondition = category ? await getCategoryByName(category) : null;
    const conditions = {
      $and: [titleCondition, categoryCondition ? { category: categoryCondition._id } : {}],
    };

    const skipAmount = (Number(page) - 1) * limit;
    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: 'desc' })
      .skip(skipAmount)
      .limit(limit);

    const events = await populateEvent(eventsQuery);
    const eventsCount = await Event.countDocuments(conditions);

    return {
      data: JSON.parse(JSON.stringify(events)),
      totalPages: Math.ceil(eventsCount / limit),
    };
  } catch (error) {
    handleError(error);
  }
}

// GET EVENTS BY ORGANIZER
export async function getEventsByUser({ sub, limit = 6, page }: GetEventsByUserParams) {
  try {
    await connectToDatabase();

    const conditions = { organizer: sub };
    const skipAmount = (page - 1) * limit;

    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: 'desc' })
      .skip(skipAmount)
      .limit(limit);

    const events = await populateEvent(eventsQuery);
    const eventsCount = await Event.countDocuments(conditions);

    return { data: JSON.parse(JSON.stringify(events)), totalPages: Math.ceil(eventsCount / limit) };
  } catch (error) {
    handleError(error);
  }
}

// GET RELATED EVENTS: EVENTS WITH SAME CATEGORY
export async function getRelatedEventsByCategory({
  categoryId,
  eventId,
  limit = 3,
  page = 1,
}: GetRelatedEventsByCategoryParams) {
  try {
    await connectToDatabase();

    const skipAmount = (Number(page) - 1) * limit;
    const conditions = { $and: [{ category: categoryId }, { _id: { $ne: eventId } }] };

    const eventsQuery = Event.find(conditions)
      .sort({ createdAt: 'desc' })
      .skip(skipAmount)
      .limit(limit);

    const events = await populateEvent(eventsQuery);
    const eventsCount = await Event.countDocuments(conditions);

    return { data: JSON.parse(JSON.stringify(events)), totalPages: Math.ceil(eventsCount / limit) };
  } catch (error) {
    handleError(error);
  }
}

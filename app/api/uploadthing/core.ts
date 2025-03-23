import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({
    image: {
      maxFileSize: "4MB", // Max file size for images
      maxFileCount: 1,    // Max number of files allowed
    },
  })
    // No middleware for authentication
    .onUploadComplete(async ({ file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("File uploaded successfully!");
      console.log("File URL:", file.url);

      // Return any metadata you want to send to the client
      return { message: "Upload successful!" };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
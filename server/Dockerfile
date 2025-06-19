# Use a Node.js base image suitable for production
FROM node:18-alpine

# Set the working directory inside the container
# This is where your Node.js application will run from
WORKDIR /app

# Copy package.json and package-lock.json first
# This allows Docker to cache the npm install step unless these files change
# IMPORTANT: Paths are relative to the Dockerfile's location (backend/ in your repo)
COPY package*.json ./

# Install only production dependencies
# Development dependencies are not needed for runtime and keep the image smaller
RUN npm install --only=production

# Copy the rest of your backend application code
# All files from your 'backend/' directory will be copied into /app in the container
COPY . .

# Expose the port your Node.js backend listens on (e.g., process.env.PORT || 3000)
# Make sure this matches the port your app actually listens on
EXPOSE 8080

# Command to start your application
# This is the command that will be executed when the container starts
# It directly runs your main Node.js file
CMD ["node", "index.js"]
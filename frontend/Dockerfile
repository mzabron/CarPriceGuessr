# Stage 1: Build the frontend application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Run the build command
# This will create your static files in the 'build' directory
RUN npm run build

# Stage 2: Serve the built application with Nginx
FROM nginx:alpine

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy the built frontend files from the builder stage into Nginx's default serving directory
# Make sure '/app/build' matches where your npm run build command puts the files
COPY --from=builder /app/build /usr/share/nginx/html

# (Optional) Copy your custom Nginx configuration for routing (see below)
# Make sure to create 'nginx.conf' in your 'frontend/' directory
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx's default HTTP port)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
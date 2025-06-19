# Stage 1: Build the frontend application
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build # This creates your files in /app/build

# Stage 2: Serve the built application with Nginx
FROM nginx:alpine
# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy the built files from the builder stage into Nginx's serving directory
COPY --from=builder /app/build /usr/share/nginx/html

# --- ADD THIS LINE FOR DEBUGGING ---
RUN ls -la /usr/share/nginx/html
# --- END DEBUGGING LINE ---

# Copy your custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
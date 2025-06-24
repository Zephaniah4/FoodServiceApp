# Stage 1: Build the React app
# Use official Node.js LTS image as the build environment
FROM node:22-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Leverage caching by installing dependencies first
# Copy package.json and package-lock.json
COPY ./package.json ./package-lock.json ./

# Install dependencies
# This will ensure that the same versions are used in production (less bugs)
RUN npm install --force 
# TODO add --frozen-lockfile when ready to lock down production dependencies

# Copy the rest of the application code and build for production
COPY ./ ./

# Build the React app
RUN npm run build

# Stage 2: Development environment
FROM node:22-alpine AS development
WORKDIR /app

# Install dependencies again for development
COPY ./package.json ./package-lock.json ./
RUN npm install --force
#TODO: --frozen-lockfile && npm cache clean --force

# Copy the full source code
COPY ./ ./

# Expose port for the development server
EXPOSE 3000
CMD ["npm", "start"]

# Stage 3: Production environment
# Use Nginx to serve the build
FROM nginx:stable-alpine AS production

# Copy the production build artifacts from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Expose the default NGINX port
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
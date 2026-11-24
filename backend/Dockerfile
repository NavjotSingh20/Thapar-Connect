# ==============================================================================
# Build Stage: Compile and extract Spring Boot 3.3 layers
# ==============================================================================
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /app

# Cache Maven dependencies layer using Google mirror to prevent 429 rate limits
COPY pom.xml settings.xml ./
RUN mvn -s settings.xml dependency:go-offline -B || true

# Copy source code and package application
COPY src ./src
RUN mvn -s settings.xml clean package -DskipTests

# Extract Spring Boot 3.3 layers using modern tools mode
RUN java -Djarmode=tools -jar target/*.jar extract --layers --launcher --destination target/extracted

# ==============================================================================
# Runtime Stage: Lightweight Eclipse Temurin 21 JRE with non-root security
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Security: Create dedicated non-root system group and user
RUN addgroup -S spring && adduser -S spring -G spring

# Create uploads directory for local storage and grant permissions
RUN mkdir -p /app/uploads && chown -R spring:spring /app

# Copy extracted layers in order of change frequency for optimal Docker layer caching
COPY --from=builder --chown=spring:spring /app/target/extracted/dependencies/ ./
COPY --from=builder --chown=spring:spring /app/target/extracted/spring-boot-loader/ ./
COPY --from=builder --chown=spring:spring /app/target/extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=spring:spring /app/target/extracted/application/ ./

USER spring:spring

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]

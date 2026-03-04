FROM php:8.3-fpm-alpine

# system deps
RUN apk add --no-cache nginx supervisor curl git unzip libpng-dev libzip-dev icu-dev oniguruma-dev \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql mbstring zip intl gd opcache

# composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# app
COPY . .

RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader

# permissions
RUN mkdir -p storage bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# nginx + supervisor
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8080
CMD ["/usr/bin/supervisord","-c","/etc/supervisord.conf"]

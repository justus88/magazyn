# ---------- 1) BUILDER (composer) ----------
FROM composer:2 AS vendor

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader

# ---------- 2) RUNTIME ----------
FROM php:8.3-fpm-alpine

# System deps (runtime) + build deps (tylko do kompilacji rozszerzeń)
RUN apk add --no-cache \
    nginx supervisor curl \
    icu-libs libpng libzip libpq libjpeg-turbo freetype \
  && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    icu-dev libpng-dev libzip-dev oniguruma-dev postgresql-dev libjpeg-turbo-dev freetype-dev \
  && docker-php-ext-configure gd --with-jpeg --with-freetype \
  && docker-php-ext-install \
    \
    pdo pdo_mysql pdo_pgsql mbstring zip intl gd opcache \
  && apk del .build-deps

# Opcache sensownie ustawione (wydajność)
RUN { \
  echo 'opcache.enable=1'; \
  echo 'opcache.enable_cli=0'; \
  echo 'opcache.memory_consumption=128'; \
  echo 'opcache.interned_strings_buffer=16'; \
  echo 'opcache.max_accelerated_files=20000'; \
  echo 'opcache.validate_timestamps=0'; \
} > /usr/local/etc/php/conf.d/opcache-recommended.ini

WORKDIR /var/www/html

# Najpierw vendor z buildera (cache!)
COPY --from=vendor /app/vendor ./vendor

# Potem reszta kodu
COPY . .

# Uprawnienia dla Laravel
RUN mkdir -p storage bootstrap/cache && chown -R www-data:www-data storage bootstrap/cache && chmod -R 775 storage bootstrap/cache

# Nginx + Supervisor
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8080
CMD ["/usr/bin/supervisord","-c","/etc/supervisord.conf"]

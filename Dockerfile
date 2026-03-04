FROM php:8.3-fpm-alpine

WORKDIR /var/www/html

# System deps (runtime) + build deps (tylko do kompilacji rozszerzeń)
RUN apk add --no-cache \
    nginx supervisor curl git unzip \
    icu-libs libpng libzip libpq libjpeg-turbo freetype \
  && apk add --no-cache --virtual .build-deps \
    $PHPIZE_DEPS \
    icu-dev libpng-dev libzip-dev oniguruma-dev postgresql-dev libjpeg-turbo-dev freetype-dev \
  && docker-php-ext-configure gd --with-jpeg --with-freetype \
  && docker-php-ext-install \
    pdo pdo_mysql pdo_pgsql mbstring zip intl gd opcache \
  && apk del .build-deps

# Opcache
RUN { \
  echo 'opcache.enable=1'; \
  echo 'opcache.enable_cli=0'; \
  echo 'opcache.memory_consumption=128'; \
  echo 'opcache.interned_strings_buffer=16'; \
  echo 'opcache.max_accelerated_files=20000'; \
  echo 'opcache.validate_timestamps=0'; \
} > /usr/local/etc/php/conf.d/opcache-recommended.ini

# Composer (copy z obrazu composer, bez osobnego stage)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Najpierw pliki composera dla cache warstw
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader

# Potem reszta kodu
COPY . .

# Uprawnienia dla Laravel
RUN mkdir -p storage bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache \
 && chmod -R 775 storage bootstrap/cache

# Nginx + Supervisor
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8080
CMD ["/usr/bin/supervisord","-c","/etc/supervisord.conf"]

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->where('email', 'justusque@gmail.com')
            ->update([
                'password' => Hash::make('30Pejotserwis!'),
            ]);
    }

    public function down(): void
    {
        //
    }
};
